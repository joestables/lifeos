import { describe, expect, it } from 'vitest'
import {
  convertsTo,
  hasTrait,
  LINK_TYPES,
  lookupMigrationSql,
  STATUSES,
  TYPES,
  typeByKey,
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

  it('generates the lookup migration with every Type and link type', () => {
    const sql = lookupMigrationSql()
    for (const t of TYPES) expect(sql).toContain(`('${t.key}', 'core'`)
    for (const l of LINK_TYPES) expect(sql).toContain(`('${l.key}', `)
  })
})
