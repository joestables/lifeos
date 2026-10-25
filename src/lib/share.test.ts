import { describe, expect, it } from 'vitest'
import { cleanLink, freeName, savedWith, sharedLink, sharedName, siteOf } from './share'

describe('RCP-003 1: what another app shares', () => {
  it('finds the link in the url, else the text, as TikTok puts it there', () => {
    expect(sharedLink({ url: 'https://example.com/pancakes/' })).toBe(
      'https://example.com/pancakes',
    )
    expect(
      sharedLink({
        text: 'Crispy chilli beef 🔥 #recipe https://www.tiktok.com/@chefjack/video/123?_r=1&_t=abc',
      }),
    ).toBe('https://www.tiktok.com/@chefjack/video/123')
    expect(sharedLink({ title: 'no link here' })).toBeNull()
  })

  it('names it from the title, else the text without its link and hashtags', () => {
    const text =
      'Crispy chilli beef 🔥 #recipe @chefjack https://www.tiktok.com/@chefjack/video/123'
    expect(sharedName({ text }, sharedLink({ text }))).toBe('Crispy chilli beef 🔥')
    expect(sharedName({ title: 'Pancakes', text }, null)).toBe('Pancakes')
    expect(sharedName({ text: 'https://example.com/x' }, 'https://example.com/x')).toBeNull()
  })

  it('says the site as the saved screen does', () => {
    expect(siteOf('https://www.tiktok.com/@chefjack/video/123')).toBe('tiktok.com')
    expect(siteOf('https://www.bbcgoodfood.com/recipes/x')).toBe('bbcgoodfood.com')
  })
})

describe('RCP-003 2: a link saved before', () => {
  const recipes = [
    {
      item: { id: 'r' },
      variations: [{ fields: { sources: ['https://www.tiktok.com/@chefjack/video/123/'] } }],
    },
  ]
  it('is found again whatever tracking the share adds', () => {
    expect(savedWith('https://www.tiktok.com/@chefjack/video/123?_r=1', recipes)?.item.id).toBe('r')
    expect(savedWith('https://example.com/x?utm_source=a#top', recipes)).toBeUndefined()
    expect(cleanLink('https://example.com/x/?utm_source=a&id=2#top')).toBe(
      'https://example.com/x?id=2',
    )
  })

  it('takes a name no Recipe of mine has', () => {
    const taken = new Set(['Pancakes', 'Pancakes 2'])
    expect(freeName('Pancakes', (n) => taken.has(n))).toBe('Pancakes 3')
    expect(freeName('Waffles', (n) => taken.has(n))).toBe('Waffles')
  })
})
