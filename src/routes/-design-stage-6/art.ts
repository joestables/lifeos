/**
 * Stand-in photos for Stage 6's design page: garments laid flat on a bed,
 * drawn as SVG, as Joe's phone would photograph them. They are pictures,
 * not interface, so their colours are a garment's own and the backdrop's
 * (ADR-0067); this file alone may hold colour values for that reason
 * (eslint.config.js). Never imported by the app itself.
 */

export type Category =
  | 'tshirt'
  | 'shirt'
  | 'jumper'
  | 'hoodie'
  | 'jacket'
  | 'coat'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'trainers'
  | 'shoes'

/** One of Joe's colours: its name and swatch (ADR-0067: stored as hex). */
export interface Colour {
  name: string
  hex: string
}

export const COLOURS = {
  white: { name: 'White', hex: '#f3f1ec' },
  black: { name: 'Black', hex: '#1e1f22' },
  navy: { name: 'Navy', hex: '#1f2a44' },
  grey: { name: 'Grey marl', hex: '#9b9da2' },
  charcoal: { name: 'Charcoal', hex: '#3b3e44' },
  olive: { name: 'Olive', hex: '#5a6240' },
  stone: { name: 'Stone', hex: '#c8bca4' },
  cream: { name: 'Cream', hex: '#ebe3d0' },
  burgundy: { name: 'Burgundy', hex: '#6a2334' },
  sky: { name: 'Light blue', hex: '#a8c3dd' },
  denim: { name: 'Mid denim', hex: '#405878' },
  forest: { name: 'Forest green', hex: '#2e4a3a' },
  camel: { name: 'Camel', hex: '#b7895a' },
  rust: { name: 'Rust', hex: '#a3532f' },
} satisfies Record<string, Colour>

export type ColourKey = keyof typeof COLOURS

/** The colour a new photo was estimated at, matching none of Joe's: a teal. */
export const NEW_TEAL: Colour = { name: 'Teal', hex: '#2f6f73' }
/** A navy photo's estimate, a little off Joe's Navy, as a camera sees it. */
export const ESTIMATE_NAVY = '#24304b'

/* ---------- Shapes, on a 400 × 400 canvas ---------- */

interface Shape {
  /** The garment's outline. */
  body: string
  /** Darker detail: necklines, seams, cuffs (stroked). */
  lines?: string
  /** Stitching, dashed and lighter (stroked). */
  stitch?: string
  /** Parts filled a shade darker: a neckline's inside, a cuff, a sole's edge. */
  shade?: string
  /** Parts filled light: a trainer's sole, buttons. */
  light?: string
  /** Folds: soft darker strokes. */
  folds?: string
}

/** A shoe's parts, its toe to the right, on its own 400-wide canvas. */
type ShoeParts = Required<Pick<Shape, 'body' | 'light' | 'lines' | 'shade'>> & { stitch: string }

const TRAINER: ShoeParts = {
  body: 'M72,262 C70,238 84,218 108,210 L148,198 C170,190 184,176 194,164 C202,154 218,150 232,156 L262,172 C282,182 304,194 326,206 C346,216 358,232 358,248 L358,262 Z',
  light: 'M66,258 L364,258 C366,272 358,284 344,286 L84,286 C70,286 62,274 66,258 Z',
  lines: 'M206,168 L222,190 M222,164 L236,186 M238,166 L250,184 M254,172 L264,186',
  shade:
    'M118,246 C160,226 214,216 286,224 L292,236 C222,230 168,238 124,256 Z M72,262 C70,240 78,226 92,218 L104,226 C94,236 92,248 94,262 Z',
  stitch: 'M80,250 C160,246 260,244 350,250',
}

const SHOE: ShoeParts = {
  body: 'M80,262 C78,244 90,232 112,226 L176,212 C196,202 218,198 240,202 C282,210 322,224 346,236 C358,242 362,252 360,262 Z',
  light:
    'M200,214 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M214,210 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
  lines: 'M184,214 C206,228 236,230 262,220 M124,232 C150,244 170,246 184,238',
  shade: 'M76,260 L364,260 L362,276 L80,276 Z',
  stitch: 'M96,250 C180,242 270,240 350,252',
}

/** Two shoes, one behind the other, as a pair lies. */
function pair(p: ShoeParts): Shape {
  const at = (d: string, dx: number, dy: number) =>
    d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+x + dx},${+y + dy}`)
  const both = (d: string) => `${at(d, 18, -46)} ${at(d, -22, 34)}`
  return {
    body: both(p.body),
    light: both(p.light),
    lines: both(p.lines),
    shade: both(p.shade),
    stitch: both(p.stitch),
  }
}

const SHAPES: Record<Category, Shape> = {
  tshirt: {
    body: 'M146,74 C170,92 230,92 254,74 L326,104 L362,170 L314,192 L300,166 L302,338 C236,348 164,348 98,338 L100,166 L86,192 L38,170 L74,104 Z',
    shade: 'M154,76 C176,96 224,96 246,76 C232,104 168,104 154,76 Z',
    lines: 'M154,76 C176,104 224,104 246,76 M300,166 L314,192 M100,166 L86,192',
    stitch: 'M104,326 C166,334 234,334 296,326 M48,166 L94,186 M352,166 L306,186',
    folds:
      'M150,200 C170,240 160,290 176,330 M246,190 C232,240 250,280 236,330 M120,150 C140,170 150,170 160,160',
  },
  shirt: {
    body: 'M152,72 L248,72 L300,94 C318,140 332,220 346,300 L312,312 C300,250 296,210 290,176 L292,352 L108,352 L110,176 C104,210 100,250 88,312 L54,300 C68,220 82,140 100,94 Z',
    shade:
      'M152,72 L200,124 L176,132 L148,86 Z M248,72 L200,124 L224,132 L252,86 Z M54,300 L88,312 L84,330 L50,318 Z M346,300 L312,312 L316,330 L350,318 Z',
    lines: 'M200,124 L200,352 M152,72 L200,124 L248,72 M88,312 L84,330 M312,312 L316,330',
    light:
      'M200,160 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M200,205 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M200,250 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M200,295 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
    stitch: 'M208,128 L208,348 M130,150 L178,150 L178,196 L130,196 Z',
    folds: 'M140,220 C150,270 140,310 150,346 M262,210 C250,260 266,300 254,346',
  },
  jumper: {
    body: 'M146,78 C170,96 230,96 254,78 L304,96 C326,106 336,140 342,170 L358,300 L320,308 L300,190 L300,326 L100,326 L100,190 L80,308 L42,300 L58,170 C64,140 74,106 96,96 Z',
    shade:
      'M100,326 L300,326 L298,350 L102,350 Z M42,300 L80,308 L76,330 L38,322 Z M358,300 L320,308 L324,330 L362,322 Z M150,80 C172,100 228,100 250,80 C240,108 160,108 150,80 Z',
    lines: 'M150,80 C172,108 228,108 250,80',
    stitch:
      'M112,330 L112,346 M124,330 L124,346 M136,330 L136,346 M148,330 L148,346 M160,330 L160,346 M172,330 L172,346 M184,330 L184,346 M196,330 L196,346 M208,330 L208,346 M220,330 L220,346 M232,330 L232,346 M244,330 L244,346 M256,330 L256,346 M268,330 L268,346 M280,330 L280,346 M292,330 L292,346',
    folds:
      'M140,200 C160,240 150,290 164,322 M258,196 C246,240 262,288 246,322 M70,220 C76,250 74,270 70,290 M330,220 C324,250 326,270 330,290',
  },
  hoodie: {
    body: 'M140,92 C150,40 250,40 260,92 L306,104 C326,114 336,146 342,176 L358,300 L320,308 L300,196 L300,326 L100,326 L100,196 L80,308 L42,300 L58,176 C64,146 74,114 94,104 Z',
    shade:
      'M100,326 L300,326 L298,350 L102,350 Z M42,300 L80,308 L76,330 L38,322 Z M358,300 L320,308 L324,330 L362,322 Z M158,96 C160,58 240,58 242,96 C228,118 172,118 158,96 Z M138,250 L262,250 L280,316 L120,316 Z',
    lines:
      'M158,96 C172,118 228,118 242,96 M138,250 L262,250 L280,316 L120,316 Z M186,114 L182,176 M214,114 L218,176',
    light:
      'M182,176 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 M218,176 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
    folds: 'M140,210 C150,230 150,240 146,250 M258,206 C250,226 252,238 256,250',
  },
  jacket: {
    body: 'M150,70 L250,70 L304,92 C324,104 334,140 340,170 L356,304 L318,312 L300,190 L300,340 L100,340 L100,190 L82,312 L44,304 L60,170 C66,140 76,104 96,92 Z',
    shade:
      'M150,70 L250,70 L246,100 C226,92 174,92 154,100 Z M100,320 L300,320 L300,346 L100,346 Z M44,304 L82,312 L78,334 L40,326 Z M356,304 L318,312 L322,334 L360,326 Z',
    lines: 'M200,96 L200,346 M120,236 L170,236 M230,236 L280,236',
    light: 'M200,96 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
    stitch:
      'M206,100 L206,320 M194,100 L194,320 M118,232 L170,232 L166,290 L122,290 Z M230,232 L282,232 L278,290 L234,290 Z',
    folds: 'M140,150 C150,180 146,210 150,228 M260,150 C250,180 254,210 250,228',
  },
  coat: {
    body: 'M152,58 L248,58 L300,80 C320,92 330,130 336,162 L352,316 L314,324 L298,186 L302,372 L98,372 L102,186 L86,324 L48,316 L64,162 C70,130 80,92 100,80 Z',
    shade:
      'M152,58 L200,150 L170,170 L140,90 Z M248,58 L200,150 L230,170 L260,90 Z M48,316 L86,324 L82,344 L44,336 Z M352,316 L314,324 L318,344 L356,336 Z',
    lines: 'M200,150 L200,372 M152,58 L200,150 L248,58 M126,270 L168,270 M232,270 L274,270',
    light:
      'M212,200 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M212,250 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M212,300 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
    folds: 'M140,220 C150,280 138,330 150,370 M260,220 C250,280 264,330 252,370',
  },
  trousers: {
    body: 'M134,52 L266,52 L286,362 L220,362 L200,154 L180,362 L114,362 Z',
    shade: 'M134,52 L266,52 L267,74 L133,74 Z',
    lines: 'M200,74 L200,154 M134,74 L266,74',
    stitch: 'M150,80 C160,104 176,108 188,104 M250,80 C240,104 224,108 212,104',
    folds: 'M150,140 L140,356 M250,140 L260,356 M206,170 C212,200 214,230 218,260',
  },
  jeans: {
    body: 'M132,52 L268,52 L290,362 L222,362 L200,156 L178,362 L110,362 Z',
    shade: 'M132,52 L268,52 L269,76 L131,76 Z',
    lines: 'M200,76 L200,156 M131,76 L269,76',
    light:
      'M200,64 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M150,80 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M250,80 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
    stitch:
      'M140,82 C154,112 176,116 190,110 M260,82 C246,112 224,116 210,110 M206,80 C214,110 214,130 206,150 M118,350 L184,350 M216,350 L282,350 M136,60 L264,60',
    folds:
      'M150,160 C146,240 150,300 142,356 M250,160 C254,240 250,300 258,356 M168,240 L178,250 M232,240 L222,250',
  },
  shorts: {
    body: 'M120,112 L280,112 L304,282 L214,294 L200,196 L186,294 L96,282 Z',
    shade: 'M120,112 L280,112 L281,134 L119,134 Z',
    lines: 'M200,134 L200,196 M119,134 L281,134',
    stitch: 'M104,270 L184,280 M216,280 L296,270 M140,140 C150,160 170,166 186,162',
    folds: 'M140,170 C136,210 136,240 130,276 M262,170 C266,210 266,240 272,276',
  },
  trainers: pair(TRAINER),
  shoes: pair(SHOE),
}

/** Each category's own small tilt and nudge, so a grid of them looks laid down by hand. */
const SCALE: Partial<Record<Category, number>> = { shorts: 1.18, trainers: 1.05, shoes: 1.05 }

const TILT: Record<Category, number> = {
  tshirt: -3,
  shirt: 2,
  jumper: -2,
  hoodie: 3,
  jacket: -1.5,
  coat: 1.5,
  trousers: 2.5,
  jeans: -2.5,
  shorts: 3,
  trainers: -4,
  shoes: 4,
}

/** Backdrops a phone photo might have: a pale bed, a warm floor. */
const BACKDROPS = [
  { base: '#e4e2dd', edge: '#cfccc5' },
  { base: '#e9e4da', edge: '#d3ccbe' },
  { base: '#dfe1e3', edge: '#c8cbcf' },
]

/** Lighter or darker by mixing with white or black (0–1). */
function mix(hex: string, toward: '#ffffff' | '#000000', amount: number): string {
  const a = hex.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  const b = toward.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  return `#${a
    .map((v, i) => Math.round(v + (b[i]! - v) * amount))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

const luminance = (hex: string) => {
  const [r, g, b] = hex.match(/\w\w/g)!.map((h) => parseInt(h, 16) / 255)
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function garmentGroup(category: Category, hex: string, id: string, transform = ''): string {
  const s = SHAPES[category]
  const dark = luminance(hex) < 0.25
  const shade = mix(hex, '#000000', dark ? 0.35 : 0.16)
  const line = mix(hex, '#000000', dark ? 0.55 : 0.3)
  const stitch = mix(hex, '#ffffff', dark ? 0.32 : 0.45)
  const soleLight =
    category === 'trainers'
      ? '#f6f5f2'
      : category === 'shoes'
        ? mix(hex, '#ffffff', 0.55)
        : mix(hex, '#ffffff', 0.85)
  const scale = SCALE[category] ?? 1
  const light = luminance(hex) > 0.7
  return `<g transform="${transform} rotate(${TILT[category]} 200 200) translate(200 200) scale(${scale}) translate(-200 -200)">
  <g filter="url(#sh${id})">
    <path d="${s.body}" fill="${hex}"/>
  </g>
  <path d="${s.body}" fill="url(#lit${id})"/>
  ${s.shade ? `<path d="${s.shade}" fill="${shade}"/>` : ''}
  ${s.folds ? `<path d="${s.folds}" fill="none" stroke="${shade}" stroke-width="7" stroke-linecap="round" opacity="${light ? 0.32 : 0.55}" filter="url(#soft${id})"/>` : ''}
  ${s.lines ? `<path d="${s.lines}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>` : ''}
  ${s.stitch ? `<path d="${s.stitch}" fill="none" stroke="${stitch}" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.7"/>` : ''}
  ${s.light ? `<path d="${s.light}" fill="${soleLight}" stroke="${mix(soleLight, '#000000', 0.12)}" stroke-width="1"/>` : ''}
</g>`
}

function defs(id: string, backdrop: (typeof BACKDROPS)[number]): string {
  return `<defs>
  <radialGradient id="bg${id}" cx="45%" cy="38%" r="75%">
    <stop offset="0" stop-color="${mix(backdrop.base, '#ffffff', 0.25)}"/>
    <stop offset="0.65" stop-color="${backdrop.base}"/>
    <stop offset="1" stop-color="${backdrop.edge}"/>
  </radialGradient>
  <linearGradient id="lit${id}" x1="0.15" y1="0" x2="0.85" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.16"/>
  </linearGradient>
  <filter id="sh${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#2a2620" flood-opacity="0.22"/>
  </filter>
  <filter id="soft${id}"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="grain${id}">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/>
    <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.09 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
</defs>`
}

const toUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

let next = 0

/** One garment's photo, square, as a data URL. */
export function garmentPhoto(category: Category, hex: string, backdrop = 0): string {
  const id = `g${next++}`
  const bd = BACKDROPS[backdrop % BACKDROPS.length]!
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
${defs(id, bd)}
<rect width="400" height="400" fill="url(#bg${id})"/>
<rect width="400" height="400" filter="url(#grain${id})" fill="#ffffff"/>
${garmentGroup(category, hex, id)}
</svg>`)
}

/**
 * A camera's view: the garment on a bed, larger, with the frame's edges
 * cropping it as a phone's would (the add flow's camera and crop).
 */
export function cameraPhoto(category: Category, hex: string): string {
  const id = `c${next++}`
  const bd = BACKDROPS[1]!
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="800" height="1200">
${defs(id, bd)}
<rect width="400" height="600" fill="url(#bg${id})"/>
<rect width="400" height="600" filter="url(#grain${id})" fill="#ffffff"/>
<path d="M0,470 C120,450 260,486 400,460 L400,600 L0,600 Z" fill="${mix(bd.edge, '#000000', 0.06)}"/>
${garmentGroup(category, hex, id, 'translate(50 140) scale(0.75)')}
</svg>`)
}
