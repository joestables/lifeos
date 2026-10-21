import { convertsTo } from './conversions.ts'
import { LINK_TYPES, type LinkTypeDefinition } from './links.ts'
import { hasTrait, TYPES, typeByKey, type TypeDefinition } from './types.ts'
import type { TimeField } from './traits.ts'

/**
 * The parts of data-model.md generated from the ontology (ADR-0036): the
 * table of the Types built so far, and the metamodel drawn from them. Each
 * sits between its markers in the document; npm run data-model rewrites
 * them, and npm run check fails when they are stale.
 */

const TIME_WORDS: Partial<Record<TimeField, string>> = {
  do_on: 'do-on',
  due_on: 'due',
  starts_at: 'start',
  ends_at: 'end',
  slot: 'slot',
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tick = (on: boolean, detail?: string) => (on ? (detail ? `✓ ${detail}` : '✓') : '—')

function statuses(t: TypeDefinition): string {
  const shown = t.statuses
    .map((s) => (t.statusLabels?.[s] ? `${s} "${t.statusLabels[s]}"` : s))
    .join(' · ')
  return t.statusNote ? `${shown} — ${t.statusNote}` : shown
}

function row(t: TypeDefinition): string {
  const times = t.timeFields.map((f) => TIME_WORDS[f]).filter(Boolean)
  const done = t.statusLabels?.done
  return [
    t.module,
    `**${t.label}**${t.about ? ` (${t.about})` : ''}`,
    tick(hasTrait(t, 'schedulable'), times.join(' / ')),
    tick(hasTrait(t, 'completable'), done ? `"${done.toLowerCase()}"` : undefined),
    tick(hasTrait(t, 'shareable')),
    tick(hasTrait(t, 'capturable')),
    t.spaceNote ?? capital(t.defaultSpace),
    statuses(t),
    t.colour,
    tick(t.labels),
    t.mark ?? '—',
    String(t.stage),
  ].join(' | ')
}

export function typesTable(): string {
  return [
    '| Module | Type | S | C | Sh | Cap | Default Space | Statuses used (labels) | Colour | Labels | Mark | Stage |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...(TYPES as readonly TypeDefinition[]).map((t) => `| ${row(t)} |`),
  ].join('\n')
}

const node = (key: string) => capital(key)

export function metamodel(): string {
  const types = TYPES as readonly TypeDefinition[]
  const modules = [...new Set(types.map((t) => t.module))]
  const lines = ['```mermaid', 'flowchart LR']
  for (const m of modules) {
    lines.push(`  subgraph ${m.toUpperCase()}[${capital(m)}]`)
    for (const t of types.filter((t) => t.module === m))
      lines.push(`    ${node(t.key)}[${t.label}]`)
    lines.push('  end')
  }
  lines.push('')
  for (const t of types) {
    for (const to of convertsTo(t)) {
      // Task ↔ Event is drawn once, both ways.
      if (convertsTo(typeByKey(to)!).includes(t.key) && to < t.key) continue
      const both = convertsTo(typeByKey(to)!).includes(t.key)
      lines.push(
        t.key === 'thought' || t.key === 'note'
          ? `  ${node(t.key)} == converts in place ==> ${node(to)}`
          : `  ${node(t.key)} -. ${both ? 'converts' : 'converts to'} .- ${node(to)}`,
      )
    }
  }
  lines.push('')
  for (const l of LINK_TYPES as readonly LinkTypeDefinition[]) {
    if (l.from === 'any' || l.to === 'any') continue
    for (const from of l.from)
      for (const to of l.to) lines.push(`  ${node(from)} -- ${l.label} --> ${node(to)}`)
  }
  lines.push('```')
  return lines.join('\n')
}

/** Replaces what sits between `<!-- generated: name -->` and `<!-- /generated: name -->`. */
export function fillGenerated(doc: string, name: string, content: string): string {
  const start = `<!-- generated: ${name} (npm run data-model) -->`
  const end = `<!-- /generated: ${name} -->`
  const from = doc.indexOf(start)
  const to = doc.indexOf(end)
  if (from < 0 || to < from) throw new Error(`data-model.md has no generated ${name} section`)
  return `${doc.slice(0, from + start.length)}\n\n${content}\n\n${doc.slice(to)}`
}

export function dataModel(doc: string): string {
  return fillGenerated(fillGenerated(doc, 'types', typesTable()), 'metamodel', metamodel())
}
