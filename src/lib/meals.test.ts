import { describe, expect, it } from 'vitest'
import {
  leftoverChoices,
  leftoversBefore,
  mealName,
  nextMealSlot,
  plannedLately,
  slotName,
  weekMeals,
  type PlannedMeal,
} from './meals'

const meal = (
  id: string,
  day: string,
  slot: string,
  extra: Partial<PlannedMeal> = {},
): PlannedMeal => ({
  id,
  title: id,
  day,
  slot,
  status: 'active',
  created_at: `2026-10-0${id.length}T00:00:00Z`,
  servings: 4,
  leftoversOf: null,
  variation: null,
  ...extra,
})

// Monday 12 October to Sunday 18 October 2026.
const WEEK = Array.from({ length: 7 }, (_, i) => `2026-10-${12 + i}`)

describe('MPL-001: the week', () => {
  it('puts each Meal in its day and slot, in the order planned', () => {
    const meals = [
      meal('katsu', '2026-10-15', 'dinner', { created_at: '2026-10-02T00:00:00Z' }),
      meal('salad', '2026-10-15', 'dinner', { created_at: '2026-10-01T00:00:00Z' }),
      meal('old', '2026-10-05', 'dinner'),
      meal('nowhere', '2026-10-15', ''),
    ]
    const week = weekMeals(meals, WEEK)
    expect(week.get('2026-10-15:dinner')?.map((m) => m.id)).toEqual(['salad', 'katsu'])
    expect([...week.keys()]).toEqual(['2026-10-15:dinner'])
  })

  it('MPL-001 4: leftovers take the name of the Meal they are of', () => {
    const katsu = meal('katsu', '2026-10-15', 'dinner', { title: 'Katsu curry' })
    const left = meal('left', '2026-10-16', 'lunch', { title: '', leftoversOf: 'katsu' })
    const byId = new Map([katsu, left].map((m) => [m.id, m]))
    expect(mealName(left, byId)).toBe('Katsu curry')
    expect(mealName(katsu, byId)).toBe('Katsu curry')
  })

  it('names a slot by its day', () => {
    expect(slotName('2026-10-15', 'dinner')).toBe('Thu dinner')
  })
})

describe('MPL-002: planning a Meal', () => {
  it('lists the Recipes of my latest Meals, newest first, each once', () => {
    const recipeOf = new Map([
      ['v1', 'katsu'],
      ['v2', 'katsu'],
      ['v3', 'ramen'],
    ])
    const meals = [
      meal('a', '2026-10-12', 'dinner', { variation: 'v1', created_at: '2026-10-01T00:00:00Z' }),
      meal('b', '2026-10-13', 'dinner', { variation: 'v3', created_at: '2026-10-02T00:00:00Z' }),
      meal('c', '2026-10-14', 'dinner', { variation: 'v2', created_at: '2026-10-03T00:00:00Z' }),
      meal('d', '2026-10-14', 'lunch', { created_at: '2026-10-04T00:00:00Z' }),
    ]
    expect(plannedLately(meals, recipeOf)).toEqual(['katsu', 'ramen'])
    expect(plannedLately(meals, recipeOf, 1)).toEqual(['katsu'])
  })

  it('MPL-002 3: leftovers of the week before, earlier the same day too, newest first', () => {
    const meals = [
      meal('mon', '2026-10-12', 'dinner'),
      meal('thuLunch', '2026-10-15', 'lunch'),
      meal('thuDinner', '2026-10-15', 'dinner'),
      meal('tooOld', '2026-10-07', 'dinner'),
      meal('later', '2026-10-16', 'lunch'),
      meal('leftover', '2026-10-14', 'lunch', { leftoversOf: 'mon' }),
    ]
    expect(leftoverChoices(meals, '2026-10-15', 'dinner').map((m) => m.id)).toEqual([
      'thuLunch',
      'mon',
    ])
  })

  it('leftovers go to the next lunch or dinner to start', () => {
    expect(nextMealSlot('2026-10-15', 'breakfast')).toEqual({ day: '2026-10-15', slot: 'lunch' })
    expect(nextMealSlot('2026-10-15', 'lunch')).toEqual({ day: '2026-10-15', slot: 'dinner' })
    expect(nextMealSlot('2026-10-15', 'dinner')).toEqual({ day: '2026-10-16', slot: 'lunch' })
  })
})

describe('MPL-003 2: a Meal moved removes its leftovers at or before it (Joe, 26 October)', () => {
  const left = (id: string, day: string, slot: string) => ({ id, leftoversOf: 'm', day, slot })
  const meals = [
    left('mon-lunch', '2026-10-12', 'lunch'),
    left('tue-lunch', '2026-10-13', 'lunch'),
    left('tue-dinner', '2026-10-13', 'dinner'),
    left('wed-lunch', '2026-10-14', 'lunch'),
    { id: 'other', leftoversOf: 'x', day: '2026-10-12', slot: 'lunch' },
  ]
  it('takes those before or in its new slot, never later the same day', () => {
    expect(leftoversBefore('m', '2026-10-13', 'lunch', meals).map((l) => l.id)).toEqual([
      'mon-lunch',
      'tue-lunch',
    ])
  })
})
