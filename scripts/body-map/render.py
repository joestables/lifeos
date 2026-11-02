"""Render the body map's passes from the atlas (ADR-0060).

Run with Blender as a Python module (see README.md):

  python scripts/body-map/render.py --source .cache/body-map --out .cache/body-map/out/<variant> \
      [--pose 14] [--smooth 0] [--height 1600]

Writes, for front and back:
  <view>_<layer>_diffuse.png  lit, white, no shine    (laid over by multiply)
  <view>_<layer>_gloss.png    its shine alone, on black (laid over by screen)
  <view>_id.png               each pixel's group, its index × 10, at twice the size
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
from mapping import ARM, ARM_X, CUTS, EYE, GROUPS, HIDDEN, SHOULDER, SKIN_DROPPED, SKIN_SURFACE  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--source', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--pose', type=float, default=14, help='degrees each arm turns out from the side')
ap.add_argument('--smooth', type=int, default=0, help='smoothing passes over the muscles: 0 keeps the fibres')
ap.add_argument('--height', type=int, default=1600)
ap.add_argument('--samples', type=int, default=96)
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
    muscles.append(o)
    for i, (g, pat) in enumerate(GROUPS, start=1):
        if re.search(pat, n):
            group_of[o.name] = i
            if n not in mapped[g]:
                mapped[g].append(n)
            break

# ---- The skin: head, hands and feet as surface; the rest rendered as the body behind,
# a layer of its own, showing only where no muscle is in front of it
surface, backing = [], []
for o in import_fbx(os.path.join(args.source, 'Regions of human body100.fbx')):
    n = bare(o.name)
    if len(o.data.polygons) < 20 or re.search(SKIN_DROPPED, n):
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


# Cut the sheets that hide a muscle.
for pat, box in CUTS:
    for o in [o for o in muscles if re.search(pat, bare(o.name))]:
        M = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        doomed = []
        for f in bm.faces:
            c = M @ f.calc_center_median()
            if abs(c.x) < box['abs_x_max'] and box['z_min'] <= c.z <= box['z_max']:
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
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=er)
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

# The pose: each arm turned out about the shoulder.
if args.pose:
    bpy.context.view_layer.update()
    sx, sz = SHOULDER
    theta = math.radians(args.pose)
    for o in muscles + surface + backing:
        w, M = world_coords(o)
        cx = abs(w[:, 0].mean())
        cz = w[:, 2].mean()
        below = smoothstep(sz + 0.04, sz - 0.10, w[:, 2])
        if re.search(ARM, bare(o.name)) or (cx > ARM_X and cz > 0.6):
            weight = below
        else:  # the torso's edge near the armpit follows a little
            weight = below * smoothstep(0.12, 0.19, np.abs(w[:, 0])) * smoothstep(0.95, 1.1, w[:, 2])
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
cam_data.ortho_scale = max(H, W)
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
    cam.location = ctr + Vector((0, sign * 10, 0))
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    h = H
    # A soft key from above left, a broad fill from the right, two rims behind.
    light(20 * h * h, (-h * 0.9, sign * h * 1.3, h * 0.8), h * 0.9)
    light(6.5 * h * h, (h * 1.1, sign * h * 1.0, h * 0.1), h * 1.2)
    light(13 * h * h, (-h * 0.8, -sign * h * 0.7, h * 0.5), h * 0.4)
    light(13 * h * h, (h * 0.8, -sign * h * 0.7, h * 0.5), h * 0.4)


def principled(name, base, spec, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Roughness'].default_value = rough
    return m


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
    ids.append(m)


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

with open(f'{args.out}/render.json', 'w') as f:
    json.dump(
        {
            'groups': [g for g, _ in GROUPS],
            'size': [width, height],
            'pose': args.pose,
            'smooth': args.smooth,
            'mapped': mapped,
        },
        f,
        indent=2,
    )
print('RENDERED', args.out, width, height, {g: len(v) for g, v in mapped.items()})
