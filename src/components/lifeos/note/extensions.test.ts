import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { noteExtensions } from './extensions'

const roundTrip = (md: string) => {
  const editor = new Editor({ extensions: noteExtensions, content: md, contentType: 'markdown' })
  const out = editor.getMarkdown()
  editor.destroy()
  return out
}

describe('NTE-004: a Note body is kept as Markdown (ADR-0046)', () => {
  it.each([
    '- [x] Passport\n- [ ] Plug adapters ×2',
    '- Book teamLab tickets\n- Ask Kenji',
    '1. The Wager\n2. Slow Productivity',
    '**Flights**: BA 5 out *Thu 5 Nov*',
    'Hotel: [hotelgracery.com](https://hotelgracery.com/shinjuku)',
    'Boiler: Worcester Greenstar\n\nStopcock under the sink.',
  ])('keeps %j as it was', (md) => {
    expect(roundTrip(md).trim()).toBe(md)
  })
})
