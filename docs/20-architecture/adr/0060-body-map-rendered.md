# ADR-0060: The body map is rendered from an anatomical model

**Status:** Provisionally agreed · 2026-11-03 (Joe)

## Context

The body map ([GYM-016](../../10-requirements/modules/gym.md#gym-016--readiness-and-the-body-map))
was a stand-in, to be redrawn once the Gym was used (Joe, 31 October).
It was drawn from ellipses and polygons placed by coordinates, and looks
it. Joe wants a realistic figure, front and back, that looks 3D, with each
built-in muscle group coloured on its own on the continuous readiness
scale (Joe, 3 November). Drawing anatomy by coordinates cannot get there.

The options were: a better hand-drawn SVG (the stand-in's way); a bought
stock vector (flat shapes with gradients, still a drawing); a live 3D
model in the browser (three.js and a model of several MB, the phone's GPU
and battery, screenshots that vary, and no element to make a button of);
or a 3D model **rendered once, ahead of time**, into layers the page
colours. Only front and back are needed, so a live model adds nothing a
rendering lacks.

## Decision

- **The source is Z-Anatomy's open atlas** (muscular system and body
  regions, CC BY-SA 4.0): 686 separate muscles, the deltoid already in
  its three parts. The pipeline downloads it at a pinned commit; it is
  never committed.
- **A pipeline in `scripts/body-map/`** runs Blender as a Python module
  (`bpy`, pinned) in a cloud session: a table maps the atlas's muscles to
  the twenty built-in groups (by `body_part`); it fixes the model (a body
  behind the gaps, deep muscles hidden, the abs and lumbar erectors
  uncovered, the head's hair and carved eyes, the pose); and it renders
  front and back, orthographic, into a **shading image**, a **mask per group**, an **outline per group** traced from its
  mask, and a manifest. Its output is committed under
  `src/assets/body-map/`; running it again gives the same files.
- **The page colours the layers**: the body in a neutral token, each
  group's mask filled with its readiness colour, the shading laid over it
  with CSS blend modes. No WebGL and no 3D library. Each group's outline is
  an SVG button, named and reachable by keyboard, on the view it shows
  most (its *home*); on the other view it is a shape to tap, not a second
  button. A small group's tap area is wider than the muscle.
- **Colour still means readiness alone**, from `--destructive`,
  `--warning` and `--success`
  ([ADR-0043](0043-colour-by-type.md)); the body and its shading are
  neutral, a token for each theme.
- **The look** — material, light, the body's colour, how much fibre shows,
  the pose — is chosen by Joe from look-dev boards and written into the
  [design spec](../../30-design/components.md) before it is built.
- **Credit**: the rendered images are an adaptation, so they carry CC
  BY-SA 4.0 (a `LICENSE` beside them) and Settings → Gym credits
  Z-Anatomy in one line.

## Consequences

- The images come to about 300 KB; the service worker precaches them, so
  the map works offline (its glob gains `webp`).
- Moving or reshaping a group means changing the mapping or the fixes and
  running the pipeline, never editing coordinates by hand.
- Python and Blender are a tool for whoever changes the map, not part of
  the app or of CI; CI checks only the output (every built-in group has a
  mask and an outline in the manifest).
- A group of my own is still not on the map (GYM-002).
- Should the licence ever not suit, a bought model replaces the source;
  only the mapping table changes.
- A model that turns could later come from the same pipeline; it is not
  planned.
