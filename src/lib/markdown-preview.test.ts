import { describe, expect, it } from 'vitest'
import { plainLine, previewLines, readInline } from './markdown-preview'

describe("a Note's start, as its card shows it (ADR-0046)", () => {
  it('reads checklists, bullets and numbers, leaving out blank lines', () => {
    expect(
      previewLines('- [x] Passport\n- [ ] Plug adapters\n\n- Ask Kenji\n1. The Wager\nHotel'),
    ).toEqual([
      { kind: 'check', done: true, text: [{ text: 'Passport' }] },
      { kind: 'check', done: false, text: [{ text: 'Plug adapters' }] },
      { kind: 'bullet', text: [{ text: 'Ask Kenji' }] },
      { kind: 'number', n: '1', text: [{ text: 'The Wager' }] },
      { kind: 'text', text: [{ text: 'Hotel' }] },
    ])
  })

  it('reads bold, italic, and links as their text', () => {
    expect(readInline('**Flights**: BA 5 *Thu* [hotel](https://x.com)')).toEqual([
      { text: 'Flights', bold: true },
      { text: ': BA 5 ' },
      { text: 'Thu', italic: true },
      { text: ' hotel' },
    ])
  })

  it('stops after 8 lines', () => {
    expect(previewLines(Array.from({ length: 12 }, (_, i) => `line ${i}`).join('\n'))).toHaveLength(
      8,
    )
  })

  it('NTE-001: a first line stands in for a title, without its marks', () => {
    expect(plainLine('- [ ] **Passport**')).toBe('Passport')
  })
})
