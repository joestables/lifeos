import { describe, expect, it } from 'vitest'
import { noteCardSize } from './note-size'

describe("a NoteCard's size, for placing it in the masonry", () => {
  it('grows with its lines, a long line counting for the lines it wraps to', () => {
    const short = noteCardSize({ title: 'Wifi', body: 'On the fridge' })
    const list = noteCardSize({ title: 'Packing', body: '- [ ] a\n- [ ] b\n- [ ] c\n- [ ] d' })
    const long = noteCardSize({ title: 'Wifi', body: 'x'.repeat(84) })
    expect(list - short).toBe(3)
    expect(long - short).toBe(2)
  })

  it('counts at most the 8 lines a card shows, and its Labels', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n')
    expect(noteCardSize({ title: 'A', body: many })).toBe(
      noteCardSize({ title: 'A', body: many + '\nmore' }),
    )
    expect(
      noteCardSize({ title: 'A', body: null, labels: ['Home'] }) -
        noteCardSize({ title: 'A', body: null }),
    ).toBe(1.5)
  })

  it("doesn't count an untitled Note's first line twice", () => {
    expect(noteCardSize({ title: 'Shopping', body: 'Shopping\nMilk' })).toBe(
      noteCardSize({ title: 'Shopping', body: 'Milk' }),
    )
  })
})
