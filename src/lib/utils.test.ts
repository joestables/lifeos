import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('lets a later Tailwind class win', () => {
    const hidden = false
    expect(cn('p-2', hidden && 'hidden', 'p-4')).toBe('p-4')
  })
})

describe('cn with LifeOS tokens', () => {
  it('keeps a token text size beside a text colour', () => {
    expect(cn('text-day', 'text-ink-foreground')).toBe('text-day text-ink-foreground')
    expect(cn('text-sm', 'text-h1')).toBe('text-h1')
    expect(cn('rounded-lg', 'rounded-control')).toBe('rounded-control')
  })
})
