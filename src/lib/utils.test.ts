import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('lets a later Tailwind class win', () => {
    const hidden = false
    expect(cn('p-2', hidden && 'hidden', 'p-4')).toBe('p-4')
  })
})
