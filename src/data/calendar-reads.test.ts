import { describe, expect, it } from 'vitest'
import source from './calendar.ts?raw'
import dbTest from '../../supabase/tests/calendar_reads_test.sql?raw'

/**
 * The Google Calendar tables are readable by column only: a column the app
 * names but may not read refuses the whole read (16 November). The database
 * test runs the app's reads as me, so it must name the same columns.
 */
describe('the app reads only the calendar columns it may', () => {
  const selects = [...source.matchAll(/\.from\('(\w+)'\)\s*\.select\(\s*'([^']+)'/g)]

  it('finds the three reads', () => {
    expect(selects.map((m) => m[1])).toEqual(['connections', 'calendar_links', 'external_refs'])
  })

  it.each(selects.map((m) => [m[1]!, m[2]!]))(
    'reads %s as the database test does',
    (table, cols) => {
      expect(dbTest).toContain(`select ${cols} from core.${table}$$`)
    },
  )
})
