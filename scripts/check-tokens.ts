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

if (problems.length) {
  console.error(`tokens.md and theme.css disagree:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`tokens.md matches theme.css (${checked} values checked).`)
