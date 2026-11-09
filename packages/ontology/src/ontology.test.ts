import { describe, expect, it } from 'vitest'
import {
  convertsTo,
  dataModel,
  metamodel,
  typesTable,
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

  it('uses statuses from the core set, and done only on Completable Types or under its own name', () => {
    for (const t of TYPES as readonly TypeDefinition[]) {
      for (const s of t.statuses) expect(STATUSES).toContain(s)
      if (hasTrait(t, 'completable')) expect(t.statuses).toContain('done')
      // A Recipe's "Complete" is a state, not a tick.
      else if (t.statuses.includes('done')) expect(t.statusLabels?.done).toBeDefined()
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
    expect(convertsTo(typeByKey('thought')!)).toEqual([
      'event',
      'note',
      'recipe',
      'shopping_list',
      'task',
    ])
    expect(convertsTo(typeByKey('note')!)).toEqual(['event', 'recipe', 'shopping_list', 'task'])
    expect(convertsTo(typeByKey('task')!)).toEqual(['event'])
    expect(convertsTo(typeByKey('event')!)).toEqual(['task'])
  })

  it('gives Labels, marks, sub-tasks and a place as the data model says (ADR-0014, ADR-0043, EVT-001)', () => {
    const look = (key: string) => {
      const t = typeByKey(key)!
      return [t.colour, t.labels, t.mark, t.subtasks, t.defaultAlert, t.place]
    }
    expect(look('thought')).toEqual(['yellow', true, undefined, false, undefined, false])
    expect(look('note')).toEqual(['yellow', true, 'pinned', false, undefined, false])
    expect(look('task')).toEqual(['blue', true, 'starred', true, 'do_on', false])
    expect(look('event')).toEqual(['blue', true, undefined, false, 'starts_at', true])
    expect(look('recipe')).toEqual(['green', false, 'favourited', false, undefined, false])
    expect(look('variation')).toEqual(['green', false, undefined, false, undefined, false])
    expect(look('meal')).toEqual(['green', false, undefined, false, undefined, false])
    expect(look('shopping_list')).toEqual(['yellow', false, undefined, false, undefined, false])
  })

  it('builds each Type in its roadmap stage (data-model.md#types)', () => {
    expect(TYPES.map((t) => [t.key, t.stage])).toEqual([
      ['thought', 2],
      ['note', 2],
      ['task', 2],
      ['event', 3],
      ['recipe', 4],
      ['variation', 4],
      ['meal', 4],
      ['shopping_list', 4.5],
      ['exercise', 5],
      ['workout_template', 5],
      ['workout', 5],
    ])
  })

  it('keeps the Gym Personal, a Workout planned for a day and following its template (ADR-0058)', () => {
    for (const key of ['exercise', 'workout_template', 'workout'])
      expect(typeByKey(key)!.defaultSpace).toBe('personal')
    expect(typeByKey('workout')!.timeFields).toEqual(['do_on'])
    expect(typeByKey('workout')!.statuses).toEqual(['active', 'done'])
    expect(LINK_TYPES.find((l) => l.key === 'follows')).toMatchObject({
      from: ['workout'],
      to: ['workout_template'],
    })
  })

  it("keeps Recipes and Variations in their author's Space, and Meals in the Household (ADR-0051)", () => {
    expect(typeByKey('recipe')!.defaultSpace).toBe('personal')
    expect(typeByKey('variation')!.defaultSpace).toBe('personal')
    expect(typeByKey('meal')!.defaultSpace).toBe('household')
    expect(typeByKey('meal')!.timeFields).toEqual(['do_on', 'slot'])
    // A date and no time: a Shopping list has no time or place (ADR-0050, 24 October).
    expect(typeByKey('shopping_list')!.timeFields).toEqual(['do_on'])
  })

  it('has no idea status on Notes (ADR-0037)', () => {
    expect(typeByKey('note')!.statuses).toEqual(['active'])
  })

  it('anchors a default Alert only on a time field the Type has', () => {
    for (const t of TYPES as readonly TypeDefinition[])
      if (t.defaultAlert) expect(t.timeFields).toContain(t.defaultAlert)
  })

  it('generates the lookup migration with every Type and link type', () => {
    const sql = lookupMigrationSql()
    for (const t of TYPES) expect(sql).toContain(`('${t.key}', '${t.module}'`)
    for (const l of LINK_TYPES) expect(sql).toContain(`('${l.key}', `)
  })
  it("generates the data model's table and metamodel from the Types (ADR-0036)", () => {
    const table = typesTable()
    for (const t of TYPES) expect(table).toContain(`**${t.label}**`)
    expect(metamodel()).toContain('Meal -- uses --> Variation')
    const doc = [
      '<!-- generated: types (npm run data-model) -->',
      'stale',
      '<!-- /generated: types -->',
      '<!-- generated: metamodel (npm run data-model) -->',
      '<!-- /generated: metamodel -->',
    ].join('\n')
    const once = dataModel(doc)
    expect(once).not.toContain('stale')
    expect(dataModel(once)).toBe(once)
  })
})
