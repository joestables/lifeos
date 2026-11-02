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
   sheets are cut away (the oblique's over the abs, the lat's over the
   lumbar erectors), which skin stays as skin (head, hands, feet), and the
   shoulder and eyes the fixes use.
3. **`render.py`** runs Blender as a Python module (`bpy`). It applies the
   fixes and the pose (`--pose`, degrees each arm turns out; `--smooth`,
   passes that soften the fibres), then renders front and back,
   orthographic: each layer's light (white, no shine) and shine (on
   black), and each pixel's group at twice the size. The _figure_ layer is
   the muscles, the eyes and the skin of the head, hands and feet; the
   _body_ layer is the rest of the skin, seen only through the figure's
   gaps. About two minutes a variant at 900 px tall on four cores.
4. **`layers.py`** puts the two layers together and writes the page's
   images: `shade` (multiply), `gloss` (screen), `silhouette`, `lines`
   (the seams between groups), a mask per group, and `manifest.json` with
   each group's outline as SVG paths, for its button. `--preview` writes
   `preview.png`, the layers coloured as the page would colour them.

Changing where a group is means changing `mapping.py` and running it again,
never editing an image or a path by hand. The images it writes are an
adaptation of the atlas, so they carry its licence, CC BY-SA 4.0.
