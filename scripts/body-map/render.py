"""Render the body map's passes from the atlas (ADR-0060).

Run with Blender as a Python module (see README.md):

  python scripts/body-map/render.py --source .cache/body-map --out .cache/body-map/out/<variant> \
      [--pose 14] [--smooth 0] [--height 1600]

Writes, for front and back:
  <view>_<layer>_diffuse.png  lit, white, no shine    (laid over by multiply)
  <view>_<layer>_gloss.png    its shine alone, on black (laid over by screen)
  <view>_id.png               each pixel's group, its index × 10, at twice the size
  <view>_<layer>_depth.png    each pixel's distance from the camera (16-bit, over depth_range)
where <layer> is 'figure' (the muscles, the eyes, the skin of the head, hands
and feet) or 'body' (the rest of the skin, shown only where the figure has a gap).
and render.json: the groups in index order, the image size, which atlas muscles went where.
"""

import argparse
import json
import math
import os
import re
import sys

import bpy  # first: bmesh and mathutils come with it
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(__file__))
from mapping import (  # noqa: E402
    ARM, ARM_X, CUTS, ELBOW_Z, EYE, GROUPS, HAIR, HIDDEN, IRIS, SHOULDER, SKIN_DROPPED, SKIN_SURFACE,
    SUPERFICIAL, TWIST_RAMP,
)

ap = argparse.ArgumentParser()
ap.add_argument('--source', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--pose', type=float, default=14, help='degrees each arm turns out from the side')
# The defaults are the map as built: Joe's choices, 3 November.
ap.add_argument('--twist', type=float, default=15, help='degrees each arm turns inwards about its length')
ap.add_argument('--pronate', type=float, default=30, help='degrees more each forearm turns inwards')
ap.add_argument('--hair', action=argparse.BooleanOptionalAction, default=True, help='keep the head\'s short hair')
ap.add_argument('--smooth', type=int, default=0, help='smoothing passes over the muscles: 0 keeps the fibres')
ap.add_argument('--height', type=int, default=1200)
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--frame', help='look-dev only: frame part of the body, "x0,x1,z0,z1" in metres')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else sys.argv[1:])
os.makedirs(args.out, exist_ok=True)


def bare(name: str) -> str:
    return re.sub(r'\.[lrj](\.\d+)?$', '', name).strip('()').lower().strip()


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    bpy.context.view_layer.update()
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in new:  # a side and its mirror share a mesh; each is edited on its own
        o.data = o.data.copy()
    return new


def drop(o):
    bpy.data.objects.remove(o)


for o in list(bpy.data.objects):
    drop(o)

# ---- The muscles -------------------------------------------------------------
muscles = []
group_of: dict[str, int] = {}
mapped: dict[str, list[str]] = {g: [] for g, _ in GROUPS}
for o in import_fbx(os.path.join(args.source, 'MuscularSystem100.fbx')):
    n = bare(o.name)
    if re.search(HIDDEN, n):
        drop(o)
        continue
    zmin = min((o.matrix_world @ Vector(c)).z for c in o.bound_box)
    if zmin < -0.02:  # misplaced in the atlas's file
        drop(o)
        continue
    for i, (g, pat) in enumerate(GROUPS, start=1):
        if re.search(pat, n):
            group_of[o.name] = i
            if n not in mapped[g]:
                mapped[g].append(n)
            break
    if o.name not in group_of and not re.search(SUPERFICIAL, n):
        zc = sum((o.matrix_world @ Vector(c)).z for c in o.bound_box) / 8
        if zc > 0.12 and abs(sum((o.matrix_world @ Vector(c)).x for c in o.bound_box) / 8) < 0.21:
            drop(o)  # deep, in the trunk, neck or legs; the hands' and feet's are under skin anyway
            continue
    muscles.append(o)

# ---- The skin: head, hands and feet as surface; the rest rendered as the body behind,
# a layer of its own, showing only where no muscle is in front of it
surface, backing = [], []
for o in import_fbx(os.path.join(args.source, 'Regions of human body100.fbx')):
    n = bare(o.name)
    if args.hair and re.search(HAIR, n):
        surface.append(o)
    elif len(o.data.polygons) < 20 or re.search(SKIN_DROPPED, n):
        drop(o)
    elif re.search(SKIN_SURFACE, n):
        surface.append(o)
    else:
        backing.append(o)


# ---- Fixes ---------------------------------------------------------------------
def world_coords(o):
    co = np.empty(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    M = np.array(o.matrix_world)
    return co @ M[:3, :3].T + M[:3, 3], M


def set_world_coords(o, w, M):
    inv = np.linalg.inv(M)
    co = w @ inv[:3, :3].T + inv[:3, 3]
    o.data.vertices.foreach_set('co', co.reshape(-1))
    o.data.update()


# Cut the sheets that hide a muscle, along clean planes.
def bisect(bm, M, co, no):
    """Split the mesh along a plane given in world space."""
    inv = M.inverted()
    co_l = inv @ Vector(co)
    no_l = (M.to_3x3().transposed() @ Vector(no)).normalized()
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co_l, plane_no=no_l)


for pat, cut in CUTS:
    tx, tz, bx, bz = cut['top_x'], cut['top_z'], cut['bottom_x'], cut['bottom_z']

    def half_width(z):
        return tx + (bx - tx) * (tz - z) / (tz - bz)

    # The edge's plane on each side: through (tx, tz) and (bx, bz), upright in y.
    dx, dz = bx - tx, bz - tz
    for o in [o for o in muscles if re.search(pat, bare(o.name))]:
        M = o.matrix_world.copy()
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for side in (1, -1):
            bisect(bm, M, (side * tx, 0, tz), (dz, 0, -side * dx))
        if tz < 2:
            bisect(bm, M, (0, 0, tz), (0, 0, 1))
        doomed = []
        for f in bm.faces:
            c = M @ f.calc_center_median()
            if c.z <= tz and abs(c.x) < half_width(c.z):
                doomed.append(f)
        bmesh.ops.delete(bm, geom=doomed, context='FACES')
        bm.to_mesh(o.data)
        bm.free()

# Eyes in the skin's empty sockets.
ex, ey, ez, er = EYE
eyes = []
for side in (1, -1):
    me = bpy.data.meshes.new('eye')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=48, radius=er)
    (iris, iris_d), (pupil, pupil_d) = IRIS
    for v in bm.verts:  # carve the iris and pupil, looking forward (-y)
        ang = math.degrees(math.acos(max(-1, min(1, -v.co.y / er))))
        depth = (pupil_d if ang < pupil else iris_d) * (1 - smoothstep(iris - 3, iris, ang))
        v.co *= (er - depth) / er
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    eye = bpy.data.objects.new('eye', me)
    bpy.context.scene.collection.objects.link(eye)
    eye.location = (side * ex, ey, ez)
    eyes.append(eye)

# Smoothing: fewer fibres, a more sculpted look.
if args.smooth:
    for o in muscles:
        m = o.modifiers.new('smooth', 'SMOOTH')
        m.factor = 0.6
        m.iterations = args.smooth

def arm_weight(o, w, top, bottom):
    """How much each vertex turns with the arm: 0 above `top`, 1 below `bottom`;
    the torso's edge near the armpit follows a little."""
    cx = abs(w[:, 0].mean())
    cz = w[:, 2].mean()
    below = smoothstep(top, bottom, w[:, 2])
    if re.search(ARM, bare(o.name)) or (cx > ARM_X and cz > 0.6):
        return below
    return below * smoothstep(0.12, 0.19, np.abs(w[:, 0])) * smoothstep(0.95, 1.1, w[:, 2])


# The twist: each arm turned inwards about its own length, before it is raised,
# while it hangs: the lateral delt comes round to the front, the palms to the thighs.
if args.twist or args.pronate:
    bpy.context.view_layer.update()
    sx, sz = SHOULDER
    limbs = [o for o in muscles + surface + backing]
    coords = {o.name: world_coords(o) for o in limbs}
    # The arm's axis at each height: the middle of the arm's own muscles there.
    pts = np.concatenate([coords[o.name][0] for o in muscles if re.search(ARM, bare(o.name))
                          or (abs(coords[o.name][0][:, 0].mean()) > ARM_X and coords[o.name][0][:, 2].mean() > 0.6)])
    bins = np.arange(0.68, sz + 0.06, 0.01)
    axis = {}
    for side in (1, -1):
        p = pts[np.sign(pts[:, 0]) == side]
        cx, cy = [], []
        for z in bins:
            sl = p[np.abs(p[:, 2] - z) < 0.015]
            cx.append(sl[:, 0].mean() if len(sl) else np.nan)
            cy.append(sl[:, 1].mean() if len(sl) else np.nan)
        cx, cy = np.array(cx), np.array(cy)
        ok = ~np.isnan(cx)
        axis[side] = (np.interp(bins, bins[ok], cx[ok]), np.interp(bins, bins[ok], cy[ok]))
    for o in limbs:
        w, M = coords[o.name]
        weight = arm_weight(o, w, *TWIST_RAMP)
        if not weight.any():
            continue
        ang = math.radians(args.twist) * weight
        ang = ang + math.radians(args.pronate) * smoothstep(ELBOW_Z, ELBOW_Z - 0.2, w[:, 2]) * (weight > 0.99)
        s = np.sign(w[:, 0])
        ax = np.where(s > 0, np.interp(w[:, 2], bins, axis[1][0]), np.interp(w[:, 2], bins, axis[-1][0]))
        ay = np.where(s > 0, np.interp(w[:, 2], bins, axis[1][1]), np.interp(w[:, 2], bins, axis[-1][1]))
        a = -s * ang  # inwards: the front of the left arm (+x) turns towards -x
        dx, dy = w[:, 0] - ax, w[:, 1] - ay
        c, sn = np.cos(a), np.sin(a)
        w2 = w.copy()
        w2[:, 0] = ax + dx * c - dy * sn
        w2[:, 1] = ay + dx * sn + dy * c
        set_world_coords(o, w2, M)

# The pose: each arm turned out about the shoulder.
if args.pose:
    bpy.context.view_layer.update()
    sx, sz = SHOULDER
    theta = math.radians(args.pose)
    for o in muscles + surface + backing:
        w, M = world_coords(o)
        weight = arm_weight(o, w, sz + 0.04, sz - 0.10)
        if not weight.any():
            continue
        s = np.sign(w[:, 0])
        ang = -s * theta * weight
        px, pz = s * sx, sz
        dx, dz = w[:, 0] - px, w[:, 2] - pz
        c, sn = np.cos(ang), np.sin(ang)
        w2 = w.copy()
        w2[:, 0] = px + dx * c + dz * sn
        w2[:, 2] = pz - dx * sn + dz * c
        set_world_coords(o, w2, M)

shown = muscles + surface + backing + eyes
for o in shown:
    o.pass_index = group_of.get(o.name, 0)
    if hasattr(o.data, 'polygons'):
        o.data.polygons.foreach_set('use_smooth', [True] * len(o.data.polygons))

# ---- Camera and light ------------------------------------------------------------
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
mn = np.full(3, 1e9)
mx = np.full(3, -1e9)
for o in muscles + surface:
    b = np.array([o.matrix_world @ Vector(c) for c in o.bound_box])
    mn = np.minimum(mn, b.min(0))
    mx = np.maximum(mx, b.max(0))
ctr = Vector(((mn + mx) / 2).tolist())
H = (mx[2] - mn[2]) * 1.03
W = (mx[0] - mn[0]) * 1.03
height = args.height
width = int(round(height * W / H / 2) * 2)
cam_ctr, cam_scale = ctr, max(H, W)
if args.frame:
    x0, x1, z0, z1 = map(float, args.frame.split(','))
    cam_ctr = Vector(((x0 + x1) / 2, ctr.y, (z0 + z1) / 2))
    cam_scale = max(x1 - x0, z1 - z0)
    width = int(round(height * (x1 - x0) / (z1 - z0) / 2) * 2)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.film_transparent = True
scene.render.dither_intensity = 0
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (1, 1, 1, 1)
bg.inputs[1].default_value = 0.12

cam_data = bpy.data.cameras.new('camera')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = cam_scale
cam = bpy.data.objects.new('camera', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
lights = []


def light(energy, offset, size):
    d = bpy.data.lights.new('light', 'AREA')
    d.energy = energy
    d.size = size
    lo = bpy.data.objects.new('light', d)
    scene.collection.objects.link(lo)
    lo.location = ctr + Vector(offset)
    lo.rotation_euler = (ctr - lo.location).to_track_quat('-Z', 'Y').to_euler()
    lights.append(lo)


def view(sign):
    """sign -1: the front (the atlas faces -y); +1: the back."""
    for lo in lights:
        drop(lo)
    lights.clear()
    cam.location = cam_ctr + Vector((0, sign * 10, 0))
    cam.rotation_euler = (cam_ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    h = H
    # A soft key from above left, a broad fill from the right, two rims behind.
    light(20 * h * h, (-h * 0.9, sign * h * 1.3, h * 0.8), h * 0.9)
    light(6.5 * h * h, (h * 1.1, sign * h * 1.0, h * 0.1), h * 1.2)
    light(13 * h * h, (-h * 0.8, -sign * h * 0.7, h * 0.5), h * 0.4)
    light(13 * h * h, (h * 0.8, -sign * h * 0.7, h * 0.5), h * 0.4)


def cull_backfaces(m):
    """Make a surface seen from behind transparent. With the deep muscles gone,
    a gap in the front (between the abs, between the pecs) would otherwise
    look through the empty trunk at the inside of the back's muscles; now it
    shows the body behind, as a gap should."""
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    shader = out.inputs['Surface'].links[0].from_socket
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    clear = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
    nt.links.new(shader, mix.inputs[1])
    nt.links.new(clear.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def principled(name, base, spec, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Roughness'].default_value = rough
    return cull_backfaces(m)


def assign(mat_for):
    for o in shown:
        o.data.materials.clear()
        o.data.materials.append(mat_for(o))


def layer(name):
    """'figure': the muscles, eyes and the head's, hands' and feet's skin; 'body': the skin behind."""
    for o in shown:
        o.hide_render = (o in backing) != (name == 'body')


diffuse = principled('diffuse', (0.8, 0.8, 0.8), 0.0, 0.6)
gloss = principled('gloss', (0, 0, 0), 0.6, 0.42)
ids = []
for i in range(len(GROUPS) + 1):
    m = bpy.data.materials.new(f'id{i}')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    v = i * 10 / 255
    e.inputs[0].default_value = (v, v, v, 1)
    nt.links.new(e.outputs[0], out.inputs[0])
    ids.append(cull_backfaces(m))


DEPTH_RANGE = 0.6  # metres the depth pass spans, centred on the body


def depth_material(sign):
    """Distance from the camera, in [0, 1] over DEPTH_RANGE: the front view
    looks along +y, the back along -y."""
    m = bpy.data.materials.new(f'depth{sign}')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    xyz = nt.nodes.new('ShaderNodeSeparateXYZ')
    rng = nt.nodes.new('ShaderNodeMapRange')
    rng.inputs['From Min'].default_value = -DEPTH_RANGE / 2
    rng.inputs['From Max'].default_value = DEPTH_RANGE / 2
    e = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(geo.outputs['Position'], xyz.inputs[0])
    if sign < 0:
        nt.links.new(xyz.outputs['Y'], rng.inputs['Value'])
    else:
        neg = nt.nodes.new('ShaderNodeMath')
        neg.operation = 'MULTIPLY'
        neg.inputs[1].default_value = -1
        nt.links.new(xyz.outputs['Y'], neg.inputs[0])
        nt.links.new(neg.outputs[0], rng.inputs['Value'])
    nt.links.new(rng.outputs['Result'], e.inputs['Color'])
    nt.links.new(e.outputs[0], out.inputs[0])
    return cull_backfaces(m)


def render(path, w, h):
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


for name, sign in (('front', -1), ('back', 1)):
    view(sign)
    scene.view_settings.view_transform = 'Standard'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.filter_width = 1.5
    for lay in ('figure', 'body'):
        layer(lay)
        assign(lambda o: diffuse)
        render(f'{args.out}/{name}_{lay}_diffuse.png', width, height)
        assign(lambda o: gloss)
        render(f'{args.out}/{name}_{lay}_gloss.png', width, height)
    layer('figure')
    # Ids: flat, exact, unfiltered, at twice the size.
    scene.view_settings.view_transform = 'Raw'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.cycles.filter_width = 0.01
    assign(lambda o: ids[o.pass_index])
    render(f'{args.out}/{name}_id.png', width * 2, height * 2)
    # Depth, for each layer: what lies far under the skin is seen through a gap.
    deep = depth_material(sign)
    scene.render.image_settings.color_mode = 'BW'
    scene.render.image_settings.color_depth = '16'
    for lay in ('figure', 'body'):
        layer(lay)
        assign(lambda o: deep)
        render(f'{args.out}/{name}_{lay}_depth.png', width, height)
    layer('figure')
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

with open(f'{args.out}/render.json', 'w') as f:
    json.dump(
        {
            'groups': [g for g, _ in GROUPS],
            'size': [width, height],
            'pose': args.pose,
            'twist': args.twist,
            'pronate': args.pronate,
            'hair': args.hair,
            'smooth': args.smooth,
            'depth_range': DEPTH_RANGE,
            'mapped': mapped,
        },
        f,
        indent=2,
    )
print('RENDERED', args.out, width, height, {g: len(v) for g, v in mapped.items()})
