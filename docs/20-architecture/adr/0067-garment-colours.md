# ADR-0067: Garment colours

**Status:** Provisionally agreed · 2026-11-18 (Joe)

**As built:** 2026-11-19, plan step 5 ([below](#as-built-19-november-plan-step-5)).

## Context

Each garment has one required colour, one of my own named colours, so
filtering by colour works (one "White", not twenty whites). The spec
([WRD-006](../../10-requirements/modules/wardrobe.md#wrd-006--colour-from-the-photo),
[WRD-007](../../10-requirements/modules/wardrobe.md#wrd-007--a-new-colour))
has the app estimate the garment's colour from its photo, offer my closest
colours, or a new one, named, when none is close. v1 had a colour
algorithm ([ADR-0002](0002-start-afresh-port-selectively.md)); Joe chose to
write it afresh (18 November), with no background removal. And a colour
swatch shows a colour that isn't a token, which
[ADR-0043](0043-colour-by-type.md) doesn't allow.

## Decision

1. **Worked out on the device**, in `packages/wardrobe`, with no AI, no
   signal and no wait: the estimate is ready before the add sheet shows,
   offline too.
2. **The estimate:** the photo, scaled down to about 100 × 100, is read in
   **OKLab**, where distance follows how different colours look. The
   background is estimated from the pixels along the photo's edges; pixels
   close to it are left out. The rest are clustered (k-means, k = 5), each
   pixel weighted more the nearer it is to the centre, and the heaviest
   cluster's centre is the garment's colour. Very dark and very light
   garments are kept apart from shadow and glare by the same weighting.
3. **Close colours:** distance is ΔE in OKLab. My colours within a
   **close** threshold are offered, closest first, up to four, the closest
   selected. When none is close, **a new colour** of the estimate is
   offered and selected, named (Joe, 18 November). A new colour within a
   tighter **twin** threshold of one of mine is flagged ("Close to White").
   Both thresholds are constants in the package, set in step 5 against a
   set of test photos kept with it, and tested there.
4. **Names:** a built-in list of everyday clothing colour names (Navy,
   Olive, Charcoal, Cream, Burgundy, Light grey and so on, a few dozen),
   each with its OKLab value; a new colour is offered the nearest. The list
   is in the package, not in Settings.
5. **Stored as hex**, `#rrggbb`, in `wardrobe.colours`
   ([ADR-0066](0066-wardrobe-in-the-database.md)); OKLab is worked out from
   it when needed.
6. **A garment's colour swatch is the one exception to colour by Type**
   ([ADR-0043](0043-colour-by-type.md), amended): a swatch shows a
   garment's own colour, which is data about the garment, not meaning in
   the interface. It appears only as a **Swatch** (a small round or square
   chip with a hairline border token, so white shows on light and black on
   dark), always beside or labelled with its colour's name, never as a
   background, text or border colour of anything else. The Swatch goes
   into the design spec in step 3, before it is built.

## Consequences

- `packages/wardrobe` holds the estimate, the distance, the suggestions and
  the names, with unit tests over the test photos (WRD-006 5).
- ADR-0043 and the design system's colour rule name the Swatch as their
  exception; no other untokenised colour is allowed.
- ADR-0002's "Wardrobe's colour algorithm" is written afresh rather than
  ported; v1's URL import isn't wanted at all (Joe, 18 November).

## As built (19 November, plan step 5)

`packages/wardrobe`: `estimateColour`, `suggestColours`, `nearTwin`,
`nameColour` and the OKLab conversions, with 34 unit tests.

- **The background is found by spreading from the photo's edges**
  (decision 2, refined): the photo is read on a grid of at most 120 cells
  a side, lightly blurred, and the background spreads from the edges to
  every neighbour within 0.03 of it, lightness counting for 0.4 of
  itself. So light falling off towards the corners and a garment's soft
  shadow are still background, and a garment's outline stops it. A single
  background colour, compared with every pixel, left the bed near the
  garment counted as garment.
- **Shades count together**: the remaining cells form five clusters (15
  rounds of k-means, seeded the same way every time), and clusters within
  0.07 of each other, lightness counting for 0.4, are one colour, so a
  black hoodie lit from one side is still black. The heaviest wins; its
  share of the garment is returned too.
- **When almost nothing is left** (under 4%: a white shirt on a white
  sheet), the centre of the photo is read as it is. A white part touching
  a pale background, such as a white stripe at the garment's edge, may be
  taken as background; the garment's main colour is unaffected.
- **The thresholds, set against the test photos:** an estimate lands
  within about 0.02 of the garment's colour (a little darker in dim
  light), while colours a person calls different are 0.065 apart or more
  (navy and black 0.066, teal and denim 0.075). So **close is 0.06**, and
  near pairs closer than that are both offered (white and cream, 0.046),
  the closer first; **a twin is within 0.035**; **four** of my colours are
  offered at most.
- **Names:** 45 everyday clothing colour names, from White to Plum.
- **The test photos are generated** (`test-photos.ts`): thirteen scenes of
  a garment on a bed, a floor or a dark sheet, with light falling off,
  folds, a shadow, a camera's noise, stripes, a glare, dim light, or the
  garment filling the frame, each read as its colour. The design page's
  fourteen garment pictures, drawn in a browser canvas as the app will,
  were also read correctly (once, by hand; they need a browser).
