import { describe, expect, it } from 'vitest'
import {
  CLOSE,
  compareColours,
  deltaE,
  estimateColour,
  hexToLab,
  hexToRgb,
  labToHex,
  nameColour,
  nearTwin,
  rgbToHex,
  suggestColours,
  TWIN,
} from './index.ts'
import { photo, type Scene } from './test-photos.ts'

/** Joe's colours as they might be (ADR-0067): the swatches of the design. */
const MINE = [
  { id: 'white', hex: '#f3f1ec' },
  { id: 'black', hex: '#1e1f22' },
  { id: 'navy', hex: '#1f2a44' },
  { id: 'grey', hex: '#9b9da2' },
  { id: 'charcoal', hex: '#3b3e44' },
  { id: 'olive', hex: '#5a6240' },
  { id: 'stone', hex: '#c8bca4' },
  { id: 'cream', hex: '#ebe3d0' },
  { id: 'burgundy', hex: '#6a2334' },
  { id: 'sky', hex: '#a8c3dd' },
  { id: 'denim', hex: '#405878' },
  { id: 'camel', hex: '#b7895a' },
]

const BED = '#e4e2dd'
const FLOOR = '#a07a55'
const DARK_SHEET = '#2b2d33'

/** The garment's own colour as it shows under the room's light: what a photo of it reads as. */
const firstOffered = (scene: Scene) =>
  suggestColours(estimateColour(photo(scene)).lab, MINE).offered[0]?.id

describe('OKLab (ADR-0067 2)', () => {
  it('turns hex into OKLab and back', () => {
    for (const { hex } of MINE) expect(labToHex(hexToLab(hex))).toBe(hex)
    expect(rgbToHex(hexToRgb('#1F2A44'))).toBe('#1f2a44')
  })

  it('puts white at lightness 1 and black at 0', () => {
    expect(hexToLab('#ffffff').l).toBeCloseTo(1, 3)
    expect(hexToLab('#000000').l).toBeCloseTo(0, 3)
  })

  it('measures how different colours look, not their numbers', () => {
    // Navy and charcoal are told apart; a white and a cream are close.
    expect(deltaE(hexToLab('#1f2a44'), hexToLab('#3b3e44'))).toBeGreaterThan(0.06)
    expect(deltaE(hexToLab('#f3f1ec'), hexToLab('#ebe3d0'))).toBeLessThan(CLOSE)
  })
})

describe('the garment colour in a photo (WRD-006 1; ADR-0067 2)', () => {
  const cases: [string, Scene, string][] = [
    ['a navy T-shirt on a pale bed', { garment: '#1f2a44', background: BED }, 'navy'],
    ['a white T-shirt on a pale bed', { garment: '#f3f1ec', background: '#cfccc5' }, 'white'],
    ['a black hoodie on a pale bed', { garment: '#1e1f22', background: BED }, 'black'],
    [
      'olive trousers on a wooden floor',
      { garment: '#5a6240', background: FLOOR, shape: 'trousers' },
      'olive',
    ],
    [
      'light blue trousers on a pale bed',
      { garment: '#a8c3dd', background: BED, shape: 'trousers' },
      'sky',
    ],
    ['camel shoes on a pale bed', { garment: '#b7895a', background: BED, shape: 'shoes' }, 'camel'],
    ['a stone jacket on a wooden floor', { garment: '#c8bca4', background: FLOOR }, 'stone'],
    [
      'a burgundy T-shirt on a dark sheet',
      { garment: '#6a2334', background: DARK_SHEET },
      'burgundy',
    ],
    [
      'a grey T-shirt filling the frame',
      { garment: '#9b9da2', background: BED, scale: 1.6 },
      'grey',
    ],
    ['a navy T-shirt in dim light', { garment: '#1f2a44', background: BED, light: 0.6 }, 'navy'],
    [
      'a denim shirt with a glare on it',
      { garment: '#405878', background: BED, glare: true },
      'denim',
    ],
    [
      'a navy T-shirt with thin white stripes',
      { garment: '#1f2a44', background: BED, stripes: { colour: '#f3f1ec', share: 0.3 } },
      'navy',
    ],
    ['a white T-shirt on a white sheet', { garment: '#f3f1ec', background: '#f1efe9' }, 'white'],
  ]
  for (const [what, scene, expected] of cases) {
    it(`reads ${what} as ${expected}`, () => {
      expect(firstOffered(scene)).toBe(expected)
    })
  }

  it('reads the same photo the same way every time', () => {
    const scene: Scene = { garment: '#5a6240', background: FLOOR, seed: 3 }
    expect(estimateColour(photo(scene)).hex).toBe(estimateColour(photo(scene)).hex)
  })

  it('reads a large photo by sampling it', () => {
    const big = estimateColour(photo({ garment: '#1f2a44', background: BED, size: 400 }))
    expect(deltaE(big.lab, hexToLab('#1f2a44'))).toBeLessThan(CLOSE)
  })

  it('says how much of the garment its colour is', () => {
    const striped = estimateColour(
      photo({ garment: '#1f2a44', background: FLOOR, stripes: { colour: '#f3f1ec', share: 0.3 } }),
    )
    expect(striped.share).toBeGreaterThan(0.5)
    expect(striped.share).toBeLessThan(0.9)
  })

  it('refuses a photo with no pixels', () => {
    expect(() => estimateColour({ width: 0, height: 0, data: [] })).toThrow()
  })
})

describe('my colours offered (WRD-006 2–3; ADR-0067 3)', () => {
  it('offers the closest first, at most four, all within the close distance', () => {
    const { offered, newColour } = suggestColours(hexToLab('#2a3550'), MINE)
    expect(offered[0]!.id).toBe('navy')
    expect(offered.length).toBeLessThanOrEqual(4)
    for (const c of offered)
      expect(deltaE(hexToLab(c.hex), hexToLab('#2a3550'))).toBeLessThanOrEqual(CLOSE)
    expect(newColour).toBe(false)
  })

  it('offers a new colour when none of mine is close', () => {
    const teal = estimateColour(photo({ garment: '#2f6f73', background: BED }))
    const { offered, newColour } = suggestColours(teal.lab, MINE)
    expect(offered).toEqual([])
    expect(newColour).toBe(true)
    expect(nameColour(teal.lab)).toBe('Teal')
  })

  it('offers a new colour when I have none yet', () => {
    expect(suggestColours(hexToLab('#1f2a44'), []).newColour).toBe(true)
  })
})

describe('a near twin (WRD-007 3)', () => {
  it('flags a new colour very close to one of mine', () => {
    expect(nearTwin('#24304b', MINE)?.id).toBe('navy')
  })

  it("doesn't flag one that is merely close", () => {
    const charcoalish = '#454850'
    expect(deltaE(hexToLab(charcoalish), hexToLab('#3b3e44'))).toBeGreaterThan(TWIN)
    expect(nearTwin(charcoalish, MINE)).toBeUndefined()
  })
})

describe('a new colour named (WRD-007 2; ADR-0067 4)', () => {
  it.each([
    ['#1f2a44', 'Navy'],
    ['#2f6f73', 'Teal'],
    ['#f3f1ec', 'White'],
    ['#5a6240', 'Olive'],
    ['#6a2334', 'Burgundy'],
    ['#b7895a', 'Camel'],
    ['#a8c3dd', 'Light blue'],
    ['#3b3e44', 'Charcoal'],
    ['#d4473a', 'Red'],
  ])('names %s %s', (hex, name) => {
    expect(nameColour(hex)).toBe(name)
  })
})

describe('my colours in order (WRD-002 3)', () => {
  it('lists the neutrals light to dark, then the rest by hue', () => {
    const names = Object.fromEntries(MINE.map((c) => [c.hex, c.id]))
    const order = MINE.map((c) => c.hex)
      .sort(compareColours)
      .map((h) => names[h])
    expect(order.slice(0, 5)).toEqual(['white', 'cream', 'grey', 'charcoal', 'black'])
    expect(order[5]).toBe('burgundy')
    expect(order.indexOf('camel')).toBeLessThan(order.indexOf('olive'))
    expect(order.indexOf('olive')).toBeLessThan(order.indexOf('sky'))
    expect(order.indexOf('sky')).toBeLessThan(order.indexOf('navy'))
  })
})
