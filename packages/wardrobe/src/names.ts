import { deltaE, hexToLab, type Lab } from './oklab.ts'

/**
 * Everyday clothing colour names (ADR-0067 4), each with a typical swatch.
 * A new colour is offered the nearest; the list lives here, not in
 * Settings.
 */
export const COLOUR_NAMES: readonly { name: string; hex: string }[] = [
  { name: 'White', hex: '#f4f3ef' },
  { name: 'Off-white', hex: '#ebe7dc' },
  { name: 'Cream', hex: '#ebe1c9' },
  { name: 'Ecru', hex: '#ddd3bb' },
  { name: 'Stone', hex: '#c8bca4' },
  { name: 'Beige', hex: '#d6c3a1' },
  { name: 'Sand', hex: '#c9ae84' },
  { name: 'Camel', hex: '#b7895a' },
  { name: 'Tan', hex: '#a87b50' },
  { name: 'Brown', hex: '#6e4b33' },
  { name: 'Chocolate', hex: '#4a3326' },
  { name: 'Black', hex: '#1d1e21' },
  { name: 'Charcoal', hex: '#3b3e44' },
  { name: 'Dark grey', hex: '#55585e' },
  { name: 'Grey', hex: '#85878c' },
  { name: 'Light grey', hex: '#b8babe' },
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Midnight', hex: '#1a2033' },
  { name: 'Blue', hex: '#2f5597' },
  { name: 'Royal blue', hex: '#2747a8' },
  { name: 'Light blue', hex: '#a8c3dd' },
  { name: 'Sky blue', hex: '#8ab9e6' },
  { name: 'Denim', hex: '#405878' },
  { name: 'Light denim', hex: '#7c95b4' },
  { name: 'Teal', hex: '#2f6f73' },
  { name: 'Turquoise', hex: '#3fb2b0' },
  { name: 'Mint', hex: '#b5dfc9' },
  { name: 'Sage', hex: '#9caf88' },
  { name: 'Olive', hex: '#5a6240' },
  { name: 'Khaki', hex: '#9a8f63' },
  { name: 'Forest green', hex: '#2e4a3a' },
  { name: 'Green', hex: '#3d7a4a' },
  { name: 'Burgundy', hex: '#6a2334' },
  { name: 'Maroon', hex: '#55202a' },
  { name: 'Red', hex: '#b5292f' },
  { name: 'Rust', hex: '#a3532f' },
  { name: 'Orange', hex: '#d9762c' },
  { name: 'Mustard', hex: '#c99a2e' },
  { name: 'Yellow', hex: '#e8cc4a' },
  { name: 'Pink', hex: '#e3a0b4' },
  { name: 'Blush', hex: '#e9c4c0' },
  { name: 'Coral', hex: '#e2725b' },
  { name: 'Lilac', hex: '#b9a7cf' },
  { name: 'Purple', hex: '#5e3f86' },
  { name: 'Plum', hex: '#5a2e4a' },
]

const NAMES = COLOUR_NAMES.map((n) => ({ ...n, lab: hexToLab(n.hex) }))

/** The nearest everyday name for a colour (WRD-007 2). */
export function nameColour(colour: string | Lab): string {
  const lab = typeof colour === 'string' ? hexToLab(colour) : colour
  let best = NAMES[0]!
  let bestD = Infinity
  for (const n of NAMES) {
    const d = deltaE(lab, n.lab)
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  return best.name
}
