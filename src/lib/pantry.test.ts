import { describe, expect, it } from 'vitest'
import {
  mergeable,
  nameKey,
  pantryGroups,
  mealsUsing,
  recipesUsing,
  typedNames,
  usedIn,
  type PantryLine,
  type PantryRecipe,
} from './pantry'

const entry = (
  id: string,
  name: string,
  aisle: string | null,
  kind = 'ingredient',
): PantryLine => ({
  id,
  name,
  kind,
  aisle,
  default_unit: null,
  added_by: 'me',
})

const ENTRIES = [
  entry('o', 'Onion', 'fruit_veg'),
  entry('s', 'Soy sauce', 'cupboard'),
  entry('g', 'Garlic', 'fruit_veg'),
  entry('e', 'Eggs', 'protein'),
  entry('b', 'Bin bags', null, 'household'),
]

const line = (id: string, pantry_id: string | null, text: string | null = null) => ({
  id,
  pantry_id,
  text,
  heading: null,
})

const recipe = (
  id: string,
  name: string,
  lines: ReturnType<typeof line>[],
  mine = true,
): PantryRecipe => ({ id, name, mine, variations: [{ id: `${id}v`, mine, lines }] })

describe('PAN-001 1: the Pantry by aisle, in aisle order, household items apart', () => {
  it('puts ingredients under their aisles in shopping order, each A–Z', () => {
    const { aisles, household } = pantryGroups(ENTRIES, '')
    expect(aisles.map((a) => [a.label, a.entries.map((e) => e.name)])).toEqual([
      ['Fruit & Veg', ['Garlic', 'Onion']],
      ['Protein', ['Eggs']],
      ['Cupboard', ['Soy sauce']],
    ])
    expect(household.map((e) => e.name)).toEqual(['Bin bags'])
  })

  it('narrows by a search, in any case and spacing', () => {
    const { aisles, household } = pantryGroups(ENTRIES, '  SOY ')
    expect(aisles.flatMap((a) => a.entries.map((e) => e.name))).toEqual(['Soy sauce'])
    expect(household).toEqual([])
  })
})

describe('PAN-001 1, 4, 5: which Recipes use an entry', () => {
  const recipes = [
    recipe('k', 'Katsu curry', [line('1', 'o'), line('2', 'o'), line('3', 's')]),
    recipe('b', 'Bibimbap', [line('4', 'o')], false),
  ]

  it('counts each Recipe once, A–Z, anyone’s I can see', () => {
    const used = recipesUsing(recipes)
    expect(used.get('o')?.map((r) => r.name)).toEqual(['Bibimbap', 'Katsu curry'])
    expect(used.get('s')?.map((r) => r.name)).toEqual(['Katsu curry'])
    expect(used.get('g')).toBeUndefined()
  })

  it('says where an entry is used', () => {
    const used = recipesUsing(recipes)
    expect(usedIn(used.get('o') ?? [])).toBe('Used in Bibimbap and 1 more')
    expect(usedIn(used.get('s') ?? [])).toBe('Used in Katsu curry')
    expect(usedIn([])).toBe('')
  })

  it('says a Meal’s own lines use an entry, after Recipes', () => {
    const meals = mealsUsing([
      { id: 'm', name: 'Cornflakes', lines: [{ pantry_id: 'milk' }, { pantry_id: 'milk' }] },
      { id: 'n', name: 'Porridge', lines: [{ pantry_id: null }] },
    ])
    expect(meals.get('milk')?.map((m) => m.name)).toEqual(['Cornflakes'])
    expect(usedIn([...(recipesUsing(recipes).get('s') ?? []), ...(meals.get('milk') ?? [])])).toBe(
      'Used in Katsu curry and 1 more',
    )
  })
})

describe('PAN-004 2: names kept as typed, to add later', () => {
  it('lists my lines kept as typed, each name once by any case, A–Z', () => {
    const names = typedNames(
      [
        recipe('k', 'Katsu curry', [
          line('1', null, 'Mirin'),
          line('2', null, 'mirin '),
          line('3', 'o'),
        ]),
        recipe('r', 'Ramen', [line('4', null, 'Mirin'), line('5', null, 'Bonito flakes')]),
        recipe('s', 'Sam’s stew', [line('6', null, 'Dashi')], false),
      ],
      ENTRIES,
    )
    expect(names.map((n) => [n.name, n.recipes, n.lines.length])).toEqual([
      ['Bonito flakes', 1, 1],
      ['Mirin', 2, 3],
    ])
    expect(names[1]?.lines[0]).toEqual({ variation: 'kv', line: '1' })
  })

  it('leaves out a name the Pantry has gained since', () => {
    expect(typedNames([recipe('k', 'Katsu', [line('1', null, 'garlic')])], ENTRIES)).toEqual([])
  })

  it('matches names as the database does', () => {
    expect(nameKey('  Spring   Onions ')).toBe('spring onions')
  })
})

describe('PAN-003 2: what an entry may merge with', () => {
  it('only my other entries of the same kind, A–Z', () => {
    const pantry = new Map(
      [
        ...ENTRIES,
        { ...entry('x', 'Scallions', 'fruit_veg'), added_by: 'sam' },
        entry('p', 'Spring onions', 'fruit_veg'),
      ].map((e) => [e.id, e]),
    )
    expect(mergeable(pantry.get('p')!, pantry, 'me').map((e) => e.name)).toEqual([
      'Eggs',
      'Garlic',
      'Onion',
      'Soy sauce',
    ])
    expect(mergeable(pantry.get('b')!, pantry, 'me')).toEqual([])
  })
})
