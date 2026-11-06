// Writes the Type icons (colours.ts's TYPE_ICONS, from Lucide) as Android
// vector drawables, for what the Android app draws natively: the Alarm
// screen's TypeTile (components.md#alarmscreen). Run after an icon changes:
//   node scripts/android-type-icons.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Each Type's Lucide icon, as colours.ts's TYPE_ICONS has them. */
const ICONS = {
  thought: 'lightbulb',
  note: 'file-text',
  task: 'square-check-big',
  event: 'calendar',
  recipe: 'chef-hat',
  meal: 'utensils',
  shopping_list: 'shopping-cart',
  exercise: 'dumbbell',
  workout_template: 'clipboard-list',
}

const n = (v) => Number(v)
/** A Lucide element as SVG path data, which is all a vector drawable draws. */
function pathOf([tag, a]) {
  switch (tag) {
    case 'path':
      return a.d
    case 'line':
      return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`
    case 'polyline':
    case 'polygon': {
      const p = a.points
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      let d = `M${p[0]} ${p[1]}`
      for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`
      return tag === 'polygon' ? d + 'Z' : d
    }
    case 'circle':
    case 'ellipse': {
      const rx = n(a.r ?? a.rx)
      const ry = n(a.r ?? a.ry)
      const [cx, cy] = [n(a.cx), n(a.cy)]
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`
    }
    case 'rect': {
      const [x, y, w, h] = [n(a.x ?? 0), n(a.y ?? 0), n(a.width), n(a.height)]
      const r = n(a.rx ?? a.ry ?? 0)
      if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`
      return (
        `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}` +
        `a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
        `v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
      )
    }
    default:
      throw new Error(`No path for <${tag}>`)
  }
}

for (const [type, name] of Object.entries(ICONS)) {
  const { __iconData } = await import(
    join(root, `node_modules/lucide-react/dist/esm/icons/${name}.mjs`)
  )
  const paths = __iconData.node
    .map(
      (el) => `    <path
        android:pathData="${pathOf(el)}"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />`,
    )
    .join('\n')
  writeFileSync(
    join(root, `android/app/src/main/res/drawable/ic_type_${type}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<!-- Lucide's ${name} (ISC), the ${type} Type's icon: written by
     scripts/android-type-icons.mjs, tinted where it is drawn. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${paths}
</vector>
`,
  )
}
console.log(`${Object.keys(ICONS).length} Type icons written.`)
