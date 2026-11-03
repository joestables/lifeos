# The body map's pipeline

The Recovery tab's body map is rendered from an anatomical model, not drawn
([ADR-0060](../../docs/20-architecture/adr/0060-body-map-rendered.md),
Proposed). These scripts turn the model into the layers the page colours.
They are a tool for changing the map, not part of the app or of CI.

```bash
scripts/body-map/fetch.sh
```

```bash
python3 -m venv .cache/body-map/venv && .cache/body-map/venv/bin/pip install -r scripts/body-map/requirements.txt
```

```bash
.cache/body-map/venv/bin/python scripts/body-map/render.py -- --source .cache/body-map --out .cache/body-map/render
```

```bash
.cache/body-map/venv/bin/python scripts/body-map/layers.py .cache/body-map/render .cache/body-map/layers --preview
```

1. **`fetch.sh`** downloads Z-Anatomy's muscular system and body regions
   (CC BY-SA 4.0) at a pinned commit into `.cache/body-map/`.
2. **`mapping.py`** says which of the atlas's muscles make each of the
   twenty built-in groups (by `body_part`), what is never shown, which
   muscles in no group still show (every other one lies deep and is
   hidden, so the gaps show the body), which sheets are cut away and
   along which lines (the obliques' over the abs, a diamond of the lat's
   over the lumbar erectors), which skin stays as skin (head, front of the
   neck, hands, feet; the hair with `--hair`), and the shoulder, elbow and
   eyes the fixes use.
3. **`render.py`** runs Blender as a Python module (`bpy`). It applies the
   fixes and the pose, then renders front and back, orthographic: each
   layer's light (white, no shine) and shine (on black), and each pixel's
   group at twice the size. The pose: `--twist`, degrees each arm turns
   inwards about its length, the whole deltoid with it; `--pronate`,
   degrees more for the forearm; `--pose`, degrees each arm then turns out
   from the side. `--hair` keeps the head's short hair; `--smooth` softens
   the fibres; `--frame` frames part of the body, for close-ups while
   working. The eyes are spheres with an iris and pupil carved in. The
   _figure_ layer is the muscles, the eyes and the skin of the head,
   neck, hands and feet; the _body_ layer is the rest of the skin, seen
   only through the figure's gaps. About two minutes a variant at 900 px
   tall on four cores, ten at 1200 px.
4. **`layers.py`** puts the two layers together and writes the page's
   images: `shade` (multiply), `gloss` (screen), `silhouette`, `lines`
   (the seams between groups), a mask per group, and `manifest.json` with
   each group's outline as SVG paths, for its button. `--trim` keeps the
   body only in the gaps and as a thin rim, so the skin no longer bulges
   past the muscles at the hips. `--preview` writes `preview.png`, the
   layers coloured as the page colours them, in Joe's look.

Changing where a group is means changing `mapping.py` and running it again,
never editing an image or a path by hand. The images it writes are an
adaptation of the atlas, so they carry its licence, CC BY-SA 4.0.
