import { describe, expect, it } from 'vitest'
import { convertTargets, itemTitle, opensAsPage, typeLook } from './item-types'

describe('Types in the app', () => {
  it('ITM-004: offers only conversions into Types the app has yet', () => {
    expect(convertTargets('thought').map((t) => t.key)).toEqual(['event', 'note', 'task'])
    expect(convertTargets('note').map((t) => t.key)).toEqual(['event', 'task'])
    expect(convertTargets('task').map((t) => t.key)).toEqual(['event'])
    expect(convertTargets('event').map((t) => t.key)).toEqual(['task'])
  })

  it('ITM-001: a Task opens in a popup everywhere; a Note on its own page on a phone', () => {
    expect([opensAsPage('task', false), opensAsPage('task', true)]).toEqual([false, false])
    expect([opensAsPage('note', false), opensAsPage('note', true)]).toEqual([false, true])
  })

  it('NTE-001: an Item with no title is named by its first line', () => {
    expect(itemTitle({ title: '', body: '\n  Boiler: Worcester\nserviced' })).toBe(
      'Boiler: Worcester',
    )
    expect(itemTitle({ title: ' ', body: null })).toBe('Untitled')
  })

  it('ADR-0043: each Type has its colour and home', () => {
    expect(typeLook('task')).toMatchObject({ colour: 'blue', mark: 'starred', home: '/tasks' })
    expect(typeLook('thought')).toMatchObject({ colour: 'yellow', home: '/inbox' })
  })
})
