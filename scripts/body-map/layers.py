"""Turn render.py's passes into the body map's layers (ADR-0060).

  python scripts/body-map/layers.py <render dir> <out dir> [--width 600] [--preview]

Writes, for front and back, in <out dir>/<view>/:
  shade.webp      the figure's light and shade, white where fully lit, its
                  alpha the silhouette          (laid over the colours by multiply)
  gloss.webp      its shine on black            (laid over by screen)
  silhouette.webp the figure's outline as alpha (the body's colour is cut from it)
  lines.webp      the seams between groups, and between a group and the body, as alpha
  <group>.webp    each group's mask as alpha
With --trim, the body shows only in the gaps between muscles and as a thin rim
round them: where the skin stands out beyond the muscles (the hips, the
waist), it is cut back.
and manifest.json: the size; the masks each view has; and per group its home
view, its outline per view as SVG paths, and its share of the frame per view.
With --preview, preview.png: the layers put together as the page would.
"""

import argparse
import json
import os

import numpy as np
from PIL import Image, ImageFilter
from skimage import measure, morphology

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--width', type=int, default=0, help='output width in px (default: as rendered)')
ap.add_argument('--preview', action='store_true')
ap.add_argument(
    '--trim', action=argparse.BooleanOptionalAction, default=True, help='pull the body in to a thin rim round the muscles'
)
args = ap.parse_args()

meta = json.load(open(os.path.join(args.src, 'render.json')))
GROUPS = meta['groups']
W0, H0 = meta['size']
W = args.width or W0
H = round(H0 * W / W0)
ALBEDO = 0.8  # the white render.py lights
GAP = 0.06  # metres under the skin beyond which the figure is seen through a gap


def load(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255


def resize(a, w, h):
    """Area-average a float image (H, W[, C]) to (h, w)."""
    img = Image.fromarray(a.astype(np.float32)) if a.ndim == 2 else None
    if img is not None:
        return np.asarray(img.resize((w, h), Image.Resampling.BOX))
    return np.stack([resize(a[..., c], w, h) for c in range(a.shape[2])], axis=-1)


def over(top, bottom):
    """Premultiplied 'over' of two straight-alpha RGBA images."""
    ta, ba = top[..., 3:4], bottom[..., 3:4]
    a = ta + ba * (1 - ta)
    rgb = top[..., :3] * ta + bottom[..., :3] * ba * (1 - ta)
    return np.concatenate([np.where(a > 0, rgb / np.maximum(a, 1e-6), 0), a], axis=-1)


def save_alpha(path, alpha):
    a = (np.clip(alpha, 0, 1) * 255).round().astype(np.uint8)
    rgba = np.zeros((*a.shape, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = a
    Image.fromarray(rgba).save(path, lossless=True, quality=100, method=6)


def save_rgba(path, rgba, lossless=False):
    Image.fromarray((np.clip(rgba, 0, 1) * 255).round().astype(np.uint8)).save(
        path, lossless=lossless, quality=88, method=6
    )


def paths_of(mask, scale):
    """The mask's outline as SVG path data, in output pixels."""
    padded = np.pad(mask, 1)
    out = []
    for c in measure.find_contours(padded, 0.5):
        if len(c) < 12:
            continue
        c = measure.approximate_polygon(c, tolerance=0.8)
        pts = [(round((x - 1) * scale, 1), round((y - 1) * scale, 1)) for y, x in c]
        out.append('M' + 'L'.join(f'{x},{y}' for x, y in pts) + 'Z')
    return ''.join(out)


manifest = {'size': [W, H], 'views': {}, 'groups': {}}
areas: dict[str, dict[str, float]] = {g: {} for g in GROUPS}
outlines: dict[str, dict[str, str]] = {g: {} for g in GROUPS}
for view in ('front', 'back'):
    d = os.path.join(args.out, view)
    os.makedirs(d, exist_ok=True)
    for old in os.listdir(d):  # what an earlier run wrote, so no stale mask is left
        if old.endswith('.webp'):
            os.remove(os.path.join(d, old))
    fig_d = load(f'{args.src}/{view}_figure_diffuse.png')
    body_d = load(f'{args.src}/{view}_body_diffuse.png')
    fig_g = load(f'{args.src}/{view}_figure_gloss.png')
    body_g = load(f'{args.src}/{view}_body_gloss.png')
    # A gap: where the figure lies more than GAP under the skin, the camera is
    # looking through a gap in the muscles (between the abs, between the pecs)
    # into the trunk; the body shows there, not whatever is deep inside.
    rng = meta['depth_range']
    fig_z = np.asarray(Image.open(f'{args.src}/{view}_figure_depth.png')).astype(np.float32) / 65535 * rng
    body_z = np.asarray(Image.open(f'{args.src}/{view}_body_depth.png')).astype(np.float32) / 65535 * rng
    gap = (fig_d[..., 3] > 0.5) & (body_d[..., 3] > 0.5) & (fig_z - body_z > GAP)
    gap = morphology.binary_opening(gap, morphology.disk(1))
    for layer in (fig_d, fig_g):
        layer[..., 3] *= ~gap
    if args.trim:
        # Close the figure's outline over gaps up to ~6 cm across, add a thin rim,
        # and keep the body only inside that.
        r_close = max(2, round(H0 * 0.017))
        r_rim = max(1, round(H0 * 0.002))
        closed = morphology.binary_closing(fig_d[..., 3] > 0.5, morphology.disk(r_close, decomposition='sequence'))
        rim = morphology.binary_dilation(closed, morphology.disk(r_rim, decomposition='sequence'))

        def soften(mask):
            img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
            return np.asarray(img).astype(np.float32) / 255

        body_d[..., 3] *= soften(rim)
        # The rim is skin lit side-on by the lights behind: dim it to an outline, not a glow.
        body_d[..., :3] *= 1 - 0.55 * soften(rim & ~closed)[..., None]
        # The rim lights catch the skin where it curves away, just outside the
        # muscles: keep the body's shine only in the gaps, or the rim glows.
        body_g[..., 3] *= soften(closed & (fig_d[..., 3] < 0.5) | (fig_d[..., 3] >= 0.5))
    diffuse = over(fig_d, body_d)
    gloss = over(fig_g, body_g)

    # Light and shade: 1 where a white surface is fully lit.
    shade = diffuse.copy()
    shade[..., :3] = np.clip(diffuse[..., :3] / ALBEDO, 0, 1)
    shade = resize(shade, W, H)
    gloss = resize(gloss, W, H)
    silhouette = shade[..., 3]
    # The shine is laid over by screen: black where there is none, no alpha needed.
    gloss_rgba = np.concatenate([gloss[..., :3] * gloss[..., 3:4], np.ones_like(gloss[..., 3:4])], -1)
    gloss_rgba[..., 3] = silhouette
    save_rgba(f'{d}/shade.webp', shade)
    save_rgba(f'{d}/gloss.webp', gloss_rgba)
    save_alpha(f'{d}/silhouette.webp', silhouette)

    # Groups: exact ids at twice the size, area-averaged into soft masks.
    ids_raw = np.asarray(Image.open(f'{args.src}/{view}_id.png').convert('RGBA'))
    ids = np.rint(ids_raw[..., 0] / 10).astype(int)
    ids[ids_raw[..., 3] < 128] = -1  # outside the figure
    gap2 = np.repeat(np.repeat(gap, 2, axis=0), 2, axis=1)[: ids.shape[0], : ids.shape[1]]
    ids[gap2] = -1  # seen through a gap: the body's, below
    # The figure's own gaps show the body behind: id 0 there too.
    body_alpha2 = resize(body_d[..., 3], ids.shape[1], ids.shape[0]) if body_d.shape[:2] != ids.shape else body_d[..., 3]
    ids[(ids == -1) & (body_alpha2 > 0.5)] = 0

    # Seams: where neighbouring pixels differ, a group touching anything.
    seam = np.zeros(ids.shape, bool)
    for dy, dx in ((0, 1), (1, 0)):
        a, b = ids[: ids.shape[0] - dy, : ids.shape[1] - dx], ids[dy:, dx:]
        edge = (a != b) & ((a > 0) | (b > 0)) & (a >= 0) & (b >= 0)
        seam[: ids.shape[0] - dy, : ids.shape[1] - dx] |= edge
        seam[dy:, dx:] |= edge
    save_alpha(f'{d}/lines.webp', resize(seam.astype(np.float32), W, H))

    masks = []
    for i, g in enumerate(GROUPS, start=1):
        m2 = (ids == i).astype(np.float32)
        if m2.sum() == 0:
            continue
        masks.append(g)
        save_alpha(f'{d}/{g}.webp', resize(m2, W, H))
        areas[g][view] = float(m2.mean())
        # Outlines from a slightly smaller copy, so small specks are dropped.
        small = resize(m2, ids.shape[1] // 2, ids.shape[0] // 2)
        outlines[g][view] = paths_of(small, W / small.shape[1])
    manifest['views'][view] = {'masks': masks}

# A group's outline is a button only where it shows enough to choose: at
# least 0.05 % of the frame and an eighth of its largest view. Its largest
# view is its home: the button named for it; the other is a shape to tap.
for g in GROUPS:
    if not areas[g]:
        raise SystemExit(f'{g} shows on neither view')
    best = max(areas[g].values())
    home = max(areas[g], key=areas[g].get)
    paths = {v: outlines[g][v] for v, a in areas[g].items() if outlines[g][v] and a >= 0.0005 and a >= best / 8}
    area = {v: round(a, 5) for v, a in areas[g].items()}  # its share of the frame, per view
    manifest['groups'][g] = {'home': home, 'paths': paths, 'area': area}

with open(os.path.join(args.out, 'manifest.json'), 'w') as f:
    json.dump(manifest, f)

if args.preview:
    demo = dict(
        chest=18, front_delts=35, lateral_delts=62, rear_delts=88, triceps=45, lats=12, traps=70,
        biceps=55, brachialis=80, forearms=95, abs=100, obliques=90, erectors=40, glutes=75, quads=25,
        hamstrings=50, adductors=85, abductors=65, calves=100, tibialis=100,
    )

    def oklch(L, C, h):
        a, b = C * np.cos(np.radians(h)), C * np.sin(np.radians(h))
        l_, m_, s_ = L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.2914855480 * b
        l, m, s = l_**3, m_**3, s_**3
        lin = np.clip([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                       -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                       -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s], 0, 1)
        return np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * lin ** (1 / 2.4) - 0.055)

    def mix(a, b, t):
        dh = (b[2] - a[2] + 180) % 360 - 180
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + dh * t)

    RED, AMBER, GREEN = (0.57, 0.19, 27), (0.8, 0.14, 70), (0.6, 0.12, 155)

    def colour(p):
        return oklch(*(mix(RED, AMBER, p / 50) if p <= 50 else mix(AMBER, GREEN, (p - 50) / 50)))

    bg = oklch(0.215, 0.0025, 260)
    tiles = []
    for view in ('front', 'back'):
        d = os.path.join(args.out, view)
        sh = load(f'{d}/shade.webp')
        gl = load(f'{d}/gloss.webp')
        sil = load(f'{d}/silhouette.webp')[..., 3:4]
        # Joe's look (3 November): Slate, body tone 35, depth 120, dark seams, shine 55.
        rgb = np.broadcast_to(oklch(0.35, 0.018, 262), sh[..., :3].shape).copy()
        for g in manifest['views'][view]['masks']:
            m = load(f'{d}/{g}.webp')[..., 3:4]
            rgb = rgb * (1 - m) + colour(demo[g]) * m
        shade = np.clip(((sh[..., :3] - 0.5) * 1.2 + 0.5) * 1.08, 0, 1)  # CSS contrast(1.2) brightness(1.08)
        rgb = rgb * shade
        seam = load(f'{d}/lines.webp')[..., 3:4] * 0.55
        rgb = rgb * (1 - seam) + oklch(0.16, 0.01, 262) * seam
        rgb = 1 - (1 - rgb) * (1 - gl[..., :3] * 0.55)
        tiles.append(rgb * sil + bg * (1 - sil))
    Image.fromarray((np.concatenate(tiles, 1) * 255).astype(np.uint8)).save(os.path.join(args.out, 'preview.png'))

sizes = {}
for root, _, files in os.walk(args.out):
    for fn in files:
        if fn.endswith('.webp'):
            sizes[fn] = sizes.get(fn, 0) + os.path.getsize(os.path.join(root, fn))
print('LAYERS', W, H, 'total KB', round(sum(sizes.values()) / 1024), {k: round(v / 1024, 1) for k, v in sorted(sizes.items(), key=lambda kv: -kv[1])[:6]})
