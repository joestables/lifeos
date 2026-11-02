import { describe, expect, it } from 'vitest'
import { dropIndex } from './use-reorder'

describe('where a reordered row lands (patterns.md#dragging)', () => {
  // Rows A B C D; the gaps are 0 (before A) to 4 (after D).
  it('a gap either side of the row dragged leaves it where it is', () => {
    expect(dropIndex(1, 1)).toBeNull()
    expect(dropIndex(1, 2)).toBeNull()
  })

  it('down: the index among the other rows, before the one after the gap', () => {
    // B into the gap after C: A C B D.
    expect(dropIndex(1, 3)).toBe(2)
    // A after the last: B C D A.
    expect(dropIndex(0, 4)).toBe(3)
  })

  it('up: the gap’s own index', () => {
    // D before A: D A B C.
    expect(dropIndex(3, 0)).toBe(0)
    expect(dropIndex(3, 2)).toBe(2)
  })
})
