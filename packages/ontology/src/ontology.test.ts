import { describe, expect, it } from 'vitest'
import {
  convertsTo,
  hasTrait,
  LINK_TYPES,
  lookupMigrationSql,
  STATUSES,
  TYPES,
  typeByKey,
  type TypeDefinition,
} from './index.ts'

describe('ontology', () => {
  it('has unique Type and link type keys', () => {
    const typeKeys = TYPES.map((t) => t.key)
    const linkKeys = LINK_TYPES.map((l) => l.key)
    expect(new Set(typeKeys).size).toBe(typeKeys.length)
    expect(new Set(linkKeys).size).toBe(linkKeys.length)
  })

  it('uses statuses from the core set, and done only on Completable Types', () => {
    for (const t of TYPES) {
      for (const s of t.statuses) expect(STATUSES).toContain(s)
      const statuses: readonly string[] = t.statuses
      expect(statuses.includes('done')).toBe(hasTrait(t, 'completable'))
    }
  })

  it('gives time fields only to Schedulable Types', () => {
    for (const t of TYPES) expect(t.timeFields.length > 0).toBe(hasTrait(t, 'schedulable'))
  })

  it('connects only Types that exist', () => {
    for (const l of LINK_TYPES) {
      for (const end of [l.from, l.to]) {
        if (end !== 'any') for (const key of end) expect(typeByKey(key)).toBeDefined()
      }
    }
  })

  it('keeps Thoughts and Notes Personal, never Shareable (ADR-0037)', () => {
    for (const key of ['thought', 'note']) {
      const t = typeByKey(key)!
      expect(hasTrait(t, 'shareable')).toBe(false)
      expect(t.defaultSpace).toBe('personal')
    }
  })

  it('converts in place as ADR-0018 says', () => {
    expect(convertsTo(typeByKey('thought')!)).toEqual(['event', 'note', 'task'])
    expect(convertsTo(typeByKey('note')!)).toEqual(['event', 'task'])
    expect(convertsTo(typeByKey('task')!)).toEqual(['event'])
    expect(convertsTo(typeByKey('event')!)).toEqual(['task'])
  })

  it('gives Labels, marks and sub-tasks as the data model says (ADR-0014, ADR-0043)', () => {
    const look = (key: string) => {
      const t = typeByKey(key)!
      return [t.colour, t.labels, t.mark, t.subtasks, t.defaultReminder]
    }
    expect(look('thought')).toEqual(['yellow', false, undefined, false, undefined])
    expect(look('note')).toEqual(['yellow', true, 'pinned', false, undefined])
    expect(look('task')).toEqual(['blue', true, 'starred', true, 'do_on'])
    expect(look('event')).toEqual(['blue', false, undefined, false, undefined])
  })

  it('has no idea status on Notes (ADR-0037)', () => {
    expect(typeByKey('note')!.statuses).toEqual(['active'])
  })

  it('anchors a default Reminder only on a time field the Type has', () => {
    for (const t of TYPES as readonly TypeDefinition[])
      if (t.defaultReminder) expect(t.timeFields).toContain(t.defaultReminder)
  })

  it('generates the lookup migration with every Type and link type', () => {
    const sql = lookupMigrationSql()
    for (const t of TYPES) expect(sql).toContain(`('${t.key}', 'core'`)
    for (const l of LINK_TYPES) expect(sql).toContain(`('${l.key}', `)
  })
})
