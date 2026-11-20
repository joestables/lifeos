import { describe, expect, it } from 'vitest'
import { convertTargets, itemTitle, offered, opensAsPage, typeLook } from './item-types'

describe('Types in the app', () => {
  it('ITM-004: offers only conversions into Types the app has yet', () => {
    // A Thought sorts into a Recipe from Stage 4 (RCP-002 4), a List, never a
    // food shop (ADR-0069), and a Reminder from Stage 7b (RMD-006).
    expect(convertTargets('thought').map((t) => t.key)).toEqual([
      'event',
      'list',
      'note',
      'recipe',
      'reminder',
      'task',
    ])
    // A Note, with its text, becomes neither a Reminder nor a List.
    expect(convertTargets('note').map((t) => t.key)).toEqual(['event', 'recipe', 'task'])
    expect(convertTargets('list').map((t) => t.key)).toEqual([])
    expect(convertTargets('task').map((t) => t.key)).toEqual(['event', 'reminder'])
    expect(convertTargets('event').map((t) => t.key)).toEqual(['reminder', 'task'])
    expect(convertTargets('reminder').map((t) => t.key)).toEqual(['event', 'task'])
  })

  it('offers the stage being built only its Types built so far', () => {
    expect([offered('task'), offered('recipe'), offered('variation'), offered('meal')]).toEqual([
      true,
      true,
      true,
      true,
    ])
    // Stage 4b's, from its step 5, and Notes' Lists (ADR-0069).
    expect([offered('shopping_list'), offered('list')]).toEqual([true, true])
    // Stage 5's, built alongside it: a Workout on Plan's filter and Add (PLN-004, PLN-006).
    expect([offered('workout'), offered('exercise'), offered('goal')]).toEqual([true, true, false])
  })

  it('ADR-0069: a List lives on Notes, a food shop on Recipes', () => {
    expect([typeLook('list').home, typeLook('list').colour]).toEqual(['/notes', 'yellow'])
    expect([typeLook('shopping_list').home, typeLook('shopping_list').colour]).toEqual([
      '/recipes',
      'green',
    ])
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
    expect(typeLook('task')).toMatchObject({ colour: 'blue', mark: 'starred', home: '/plan' })
    expect(typeLook('thought')).toMatchObject({ colour: 'yellow', home: '/notes' })
    expect(typeLook('recipe')).toMatchObject({
      colour: 'green',
      mark: 'favourited',
      home: '/recipes',
    })
  })
})
