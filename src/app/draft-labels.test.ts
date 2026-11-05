import { describe, expect, it } from 'vitest'
import { labelIn } from './draft-labels'

describe('a Label is its Item’s Space’s (HSH-005 1)', () => {
  const personal = 'me'
  it('offers a Personal Item my Personal Labels, a shared one its Household’s', () => {
    const labels = [{ space_id: 'me' }, { space_id: 'home' }, { space_id: '' }]
    expect(labels.filter(labelIn(null, personal))).toEqual([{ space_id: 'me' }, { space_id: '' }])
    expect(labels.filter(labelIn('me', personal))).toEqual([{ space_id: 'me' }, { space_id: '' }])
    expect(labels.filter(labelIn('home', personal))).toEqual([{ space_id: 'home' }])
  })
})
