/**
 * Fails when docs/30-design/tokens.md and src/styles/theme.css disagree
 * (docs/30-design/README.md#enforcement): every value the spec gives must
 * be the theme's, and every variable the theme defines must be in the spec.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const css = readFileSync(join(root, 'src/styles/theme.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)
const md = readFileSync(join(root, 'docs/30-design/tokens.md'), 'utf8')

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

function block(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`theme.css has no ${selector} block`)
  const end = css.indexOf('\n}', start)
  const vars = new Map<string, string>()
  for (const m of css.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g))
    vars.set(m[1]!, squash(m[2]!))
  return vars
}

const light = block(':root')
const dark = block('.dark')
const theme = block('@theme inline')
const lightValue = (name: string) => light.get(name) ?? theme.get(name)
const darkValue = (name: string) => dark.get(name) ?? lightValue(name)

/** What a cell in tokens.md says the value is, as theme.css would write it. */
function expected(cell: string, lightCell?: string): string | undefined {
  const c = cell.trim()
  if (c === '' || c === '—') return undefined
  if (c === 'same') return lightCell === undefined ? undefined : expected(lightCell)
  if (c === 'none') return 'none'
  let m = c.match(/^= `(--[\w-]+)`$/)
  if (m) return `var(${m[1]})`
  m = c.match(/^`(--[\w-]+)` at (\d+%)$/)
  if (m) return `color-mix(in oklch, var(${m[1]}) ${m[2]}, transparent)`
  m = c.match(/^`([^`]+)`$/)
  if (m) return squash(m[1]!)
  m = c.match(/^(\d+(?:\.\d+)?(?:px|ms|%))$/)
  if (m) return m[1]
  return undefined
}

const problems: string[] = []
let checked = 0
let columns: { light?: number; dark?: number; value?: number } = {}

for (const line of md.split('\n')) {
  if (!line.startsWith('|')) continue
  const cells = line.split('|').slice(1, -1)
  if (/^\s*Token\s*$/.test(cells[0] ?? '')) {
    const index = (name: string) => {
      const i = cells.findIndex((c) => c.trim() === name)
      return i < 0 ? undefined : i
    }
    columns = { light: index('Light'), dark: index('Dark'), value: index('Value') }
    continue
  }
  const name = cells[0]?.match(/^\s*`(--[\w-]+)`/)?.[1]
  if (!name) continue
  const check = (
    cell: string | undefined,
    actual: string | undefined,
    mode: string,
    lightCell?: string,
  ) => {
    if (cell === undefined) return
    const want = expected(cell, lightCell)
    if (want === undefined) return
    checked++
    if (actual !== want)
      problems.push(
        `${name} (${mode}): tokens.md says ${want}, theme.css has ${actual ?? 'nothing'}`,
      )
  }
  if (columns.light !== undefined) {
    const lightCell = cells[columns.light]
    check(lightCell, lightValue(name), 'light')
    if (columns.dark !== undefined) check(cells[columns.dark], darkValue(name), 'dark', lightCell)
  } else if (columns.value !== undefined) {
    check(cells[columns.value], lightValue(name), 'value')
  }
}

for (const name of [...light.keys(), ...dark.keys()]) {
  if (!md.includes(`\`${name}\``)) problems.push(`${name} is in theme.css but not in tokens.md`)
}

/** An `oklch(L C h)` value as Android's `#RRGGBB`, or `#AARRGGBB` with an alpha (`/ 6.5%`). */
function oklchHex(value: string | undefined): string | undefined {
  const m = value?.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+)%)?\)$/)
  if (!m) return undefined
  const [L, C, h] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180]
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]
  const srgb = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
  const byte = (x: number) =>
    Math.round(Math.min(1, Math.max(0, x)) * 255)
      .toString(16)
      .padStart(2, '0')
  const alpha = m[4] === undefined ? '' : byte(Number(m[4]) / 100)
  return `#${alpha}${linear.map((x) => byte(srgb(x))).join('')}`.toUpperCase()
}

/** A token's value with var() references followed. */
const follow = (get: (name: string) => string | undefined, name: string): string | undefined => {
  const v = get(name)
  const ref = v?.match(/^var\((--[\w-]+)\)$/)
  return ref ? follow(get, ref[1]!) : v
}

/**
 * The Android app's colours (android/app/src/main/res): what Android draws
 * before the page must be the theme's, as hex (ADR-0061).
 */
const res = join(root, 'android/app/src/main/res')
const androidColour = (file: string, name: string) =>
  readFileSync(join(res, file), 'utf8').match(
    new RegExp(`<color name="${name}">(#(?:[0-9A-Fa-f]{2})?[0-9A-Fa-f]{6})</color>`),
  )?.[1]
for (const [file, name, want, what] of [
  [
    'values/colors.xml',
    'lifeos_background',
    oklchHex(lightValue('--background')),
    '--background, light',
  ],
  [
    'values-night/colors.xml',
    'lifeos_background',
    oklchHex(darkValue('--background')),
    '--background, dark',
  ],
  [
    'values/ic_launcher_background.xml',
    'ic_launcher_background',
    oklchHex(darkValue('--background')),
    '--background, dark',
  ],
  // What the Alarm screen draws natively (components.md#alarmscreen) and
  // notifications' tint (ADR-0063).
  ...(
    [
      ['lifeos_foreground', '--foreground'],
      ['lifeos_muted_foreground', '--muted-foreground'],
      ['lifeos_card', '--card'],
      ['lifeos_secondary', '--secondary'],
      ['lifeos_hairline', '--hairline'],
      ...(['blue', 'yellow', 'coral', 'green', 'orange', 'purple'] as const).flatMap((c) => [
        [`lifeos_t_${c}`, `--t-${c}`],
        [`lifeos_t_${c}_text`, `--t-${c}-text`],
        [`lifeos_t_${c}_foreground`, `--t-${c}-foreground`],
      ]),
    ] as const
  ).flatMap(
    ([name, token]) =>
      [
        ['values/colors.xml', name, oklchHex(follow(lightValue, token)), `${token}, light`],
        ['values-night/colors.xml', name, oklchHex(follow(darkValue, token)), `${token}, dark`],
      ] as const,
  ),
] as const) {
  checked++
  const actual = androidColour(file, name)
  if (actual?.toUpperCase() !== want)
    problems.push(`Android ${file} ${name}: should be ${what} (${want}), is ${actual ?? 'missing'}`)
}

// The TypeTile's tint: the Type's colour at --tile-mix (integers.xml).
for (const [file, value] of [
  ['values/integers.xml', lightValue('--tile-mix')],
  ['values-night/integers.xml', darkValue('--tile-mix')],
] as const) {
  checked++
  const actual = readFileSync(join(res, file), 'utf8').match(
    /<integer name="lifeos_tile_mix">(\d+)<\/integer>/,
  )?.[1]
  if (`${actual}%` !== value)
    problems.push(`Android ${file} lifeos_tile_mix: should be --tile-mix (${value}), is ${actual}`)
}

if (problems.length) {
  console.error(`tokens.md and theme.css disagree:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`tokens.md matches theme.css (${checked} values checked).`)
