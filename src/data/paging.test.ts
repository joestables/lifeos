import { describe, expect, it } from 'vitest'
import { allRows, PAGE_ROWS } from './paging'

describe('reading a table whole, a page at a time (ADR-0042)', () => {
  const table = (n: number) => Array.from({ length: n }, (_, i) => i)
  const pages = (rows: number[]) => {
    const asked: [number, number][] = []
    const page = async (from: number, to: number) => {
      asked.push([from, to])
      return { data: rows.slice(from, to + 1), error: null }
    }
    return { asked, page }
  }

  it('one short page is all there is', async () => {
    const { asked, page } = pages(table(3))
    expect(await allRows(page)).toEqual([0, 1, 2])
    expect(asked).toEqual([[0, PAGE_ROWS - 1]])
  })

  it('past the Data API’s limit, every row comes back', async () => {
    const { asked, page } = pages(table(2 * PAGE_ROWS + 5))
    const rows = await allRows(page)
    expect(rows).toHaveLength(2 * PAGE_ROWS + 5)
    expect(rows.at(-1)).toBe(2 * PAGE_ROWS + 4)
    expect(asked).toHaveLength(3)
  })

  it('exactly a page asks once more, and stops at the empty one', async () => {
    const { asked, page } = pages(table(PAGE_ROWS))
    expect(await allRows(page)).toHaveLength(PAGE_ROWS)
    expect(asked).toHaveLength(2)
  })

  it('an error is thrown', async () => {
    const failing = async () => ({ data: null, error: new Error('down') })
    await expect(allRows(failing)).rejects.toThrow('down')
  })
})
