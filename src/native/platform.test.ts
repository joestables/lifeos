import { describe, expect, it } from 'vitest'
import { isAndroidApp } from './platform'

describe('isAndroidApp (AND-005)', () => {
  it('is false on the web, so the web never runs the app’s code', () => {
    expect(isAndroidApp()).toBe(false)
  })
})
