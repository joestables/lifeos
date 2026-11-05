import { afterEach, describe, expect, it } from 'vitest'
import { isAndroidApp, isNewer } from './platform'

describe('isAndroidApp (AND-005)', () => {
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor
  })
  it('is false on the web, so the web never runs the app’s code', () => {
    expect(isAndroidApp()).toBe(false)
  })
  it('is true only inside the Android app', () => {
    ;(globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
    }
    expect(isAndroidApp()).toBe(true)
  })
})

describe('isNewer (AND-001 2)', () => {
  it('compares versions part by part', () => {
    expect(isNewer('1.0.3', '1.0.2')).toBe(true)
    expect(isNewer('1.10.0', '1.9.9')).toBe(true)
    expect(isNewer('1.0', '1.0.0')).toBe(false)
    expect(isNewer('0.9.9', '1.0.0')).toBe(false)
  })
})
