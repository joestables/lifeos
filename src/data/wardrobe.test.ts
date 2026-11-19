import { describe, expect, it } from 'vitest'
import { applyPending } from './overlay'
import type { QueueEntry } from './queue/store'
import type { ItemRow, WriteFn } from './types'
import {
  applyPendingGarments,
  applyPendingGarmentTags,
  applyPendingLists,
  applyPendingOutfitCollections,
  applyPendingWeatherPlace,
  type GarmentRow,
  type WardrobeLists,
} from './wardrobe'
import { placeLabel, splitPlace } from './weather'

let n = 0
const entry = (
  fn: WriteFn,
  args: Record<string, unknown>,
  state: QueueEntry['state'] = 'pending',
): QueueEntry => ({
  id: String(++n).padStart(4, '0'),
  fn,
  args,
  itemIds: [],
  createdAt: Date.UTC(2026, 10, 19),
  attempts: 0,
  state,
})

const lists = (): WardrobeLists => ({
  category: [
    { id: 'c1', name: 'Shirt', position: 'a', hex: null },
    { id: 'c2', name: 'Trousers', position: 'b', hex: null },
  ],
  size: [],
  brand: [
    { id: 'b1', name: 'Gap', position: null, hex: null },
    { id: 'b2', name: 'Uniqlo', position: null, hex: null },
  ],
  fit: [],
  tag: [],
  colour: [{ id: 'k1', name: 'Navy', position: null, hex: '#1f2a44' }],
  collection: [],
})

const garment = (id: string, brand: string): GarmentRow => ({
  item_id: id,
  category_id: 'c1',
  size_id: 's1',
  brand_id: brand,
  colour_id: 'k1',
  fit_id: null,
  own_name: null,
})

describe('the Wardrobe’s lists, unsent writes laid over (WRD-028; OFF-001)', () => {
  it('adds an entry where it was placed, and an A–Z one by its name', () => {
    const out = applyPendingLists(lists(), [
      entry('wardrobe.save_entry', {
        p_list: 'category',
        p_id: 'c3',
        p_name: ' Jacket ',
        p_position: '0',
      }),
      entry('wardrobe.save_entry', { p_list: 'brand', p_id: 'b3', p_name: 'Arket' }),
    ])
    expect(out.category.map((c) => c.name)).toEqual(['Jacket', 'Shirt', 'Trousers'])
    expect(out.brand.map((b) => b.name)).toEqual(['Arket', 'Gap', 'Uniqlo'])
  })

  it('renames a colour and changes its swatch, keeping its place', () => {
    const out = applyPendingLists(lists(), [
      entry('wardrobe.save_entry', {
        p_list: 'colour',
        p_id: 'k1',
        p_name: 'Ink',
        p_hex: '#1A2B3C',
      }),
    ])
    expect(out.colour).toEqual([{ id: 'k1', name: 'Ink', position: null, hex: '#1a2b3c' }])
  })

  it('moves an entry dragged into place', () => {
    const out = applyPendingLists(lists(), [
      entry('wardrobe.set_entry_position', { p_list: 'category', p_id: 'c2', p_position: '0' }),
    ])
    expect(out.category.map((c) => c.id)).toEqual(['c2', 'c1'])
  })

  it('takes away an entry removed or merged, until the server answers', () => {
    const out = applyPendingLists(lists(), [
      entry('wardrobe.remove_entry', { p_list: 'category', p_id: 'c2' }),
      entry('wardrobe.merge_entry', { p_list: 'brand', p_from: 'b2', p_into: 'b1' }),
    ])
    expect(out.category.map((c) => c.id)).toEqual(['c1'])
    expect(out.brand.map((b) => b.id)).toEqual(['b1'])
    // A refused removal comes back.
    const failed = applyPendingLists(lists(), [
      entry('wardrobe.remove_entry', { p_list: 'category', p_id: 'c2' }, 'failed'),
    ])
    expect(failed.category).toHaveLength(2)
  })

  it('leaves the lists as they were with nothing waiting', () => {
    const l = lists()
    expect(applyPendingLists(l, [])).toBe(l)
  })
})

describe('a merge moves what used the entry (WRD-028 3–5)', () => {
  const merge = (list: string, from: string, into: string) =>
    entry('wardrobe.merge_entry', { p_list: list, p_from: from, p_into: into })

  it('moves garments to the brand kept', () => {
    const out = applyPendingGarments(
      [garment('g1', 'b2'), garment('g2', 'b1')],
      [merge('brand', 'b2', 'b1')],
    )
    expect(out.map((g) => g.brand_id)).toEqual(['b1', 'b1'])
  })

  it('moves tags without doubling them', () => {
    const out = applyPendingGarmentTags(
      [
        { garment_id: 'g1', tag_id: 't2' },
        { garment_id: 'g1', tag_id: 't1' },
        { garment_id: 'g2', tag_id: 't2' },
      ],
      [merge('tag', 't2', 't1')],
    )
    expect(out).toEqual([
      { garment_id: 'g1', tag_id: 't1' },
      { garment_id: 'g2', tag_id: 't1' },
    ])
  })

  it('keeps outfits when their collection is deleted or merged', () => {
    const rows = [
      { outfit_id: 'o1', collection_id: 'k1' },
      { outfit_id: 'o2', collection_id: 'k2' },
    ]
    expect(
      applyPendingOutfitCollections(rows, [
        entry('wardrobe.remove_entry', { p_list: 'collection', p_id: 'k1' }),
      ]),
    ).toEqual([{ outfit_id: 'o2', collection_id: 'k2' }])
    expect(applyPendingOutfitCollections(rows, [merge('collection', 'k2', 'k1')])).toEqual([
      { outfit_id: 'o1', collection_id: 'k1' },
      { outfit_id: 'o2', collection_id: 'k1' },
    ])
  })
})

describe('the weather’s place (WRD-028 6; ADR-0068 4)', () => {
  it('is the place last chosen', () => {
    const place = applyPendingWeatherPlace(null, [
      entry('wardrobe.set_weather_place', {
        p_name: 'Manchester, England, United Kingdom',
        p_latitude: 53.48095,
        p_longitude: -2.23743,
      }),
    ])
    expect(place).toEqual({
      name: 'Manchester, England, United Kingdom',
      latitude: 53.48095,
      longitude: -2.23743,
    })
  })

  it('is stored with its region, and shown on two lines', () => {
    const label = placeLabel({ name: 'Manchester', region: 'England, United Kingdom' })
    expect(splitPlace(label)).toEqual({ name: 'Manchester', region: 'England, United Kingdom' })
    expect(splitPlace('Leeds')).toEqual({ name: 'Leeds', region: '' })
  })
})

describe('a garment retired (WRD-013)', () => {
  const row = { id: 'g1', type: 'garment', status: 'active' } as ItemRow
  it('is Retired at once, and brought back', () => {
    expect(applyPending([row], [entry('wardrobe.retire_garment', { p_id: 'g1' })])[0]?.status).toBe(
      'cancelled',
    )
    expect(
      applyPending([row], [entry('wardrobe.retire_garment', { p_id: 'g1', p_retired: false })])[0]
        ?.status,
    ).toBe('active')
  })
})

describe('a garment, unsent (WRD-005 6, WRD-010 2, WRD-012 2)', () => {
  const made = entry('wardrobe.create_garment', {
    p_id: 'g9',
    p_category: 'c1',
    p_size: 's1',
    p_brand: 'b1',
    p_colour: 'k1',
    p_tags: ['t1'],
  })
  it('shows a new garment at once, with its tags', () => {
    expect(applyPendingGarments([], [made])).toEqual([
      {
        item_id: 'g9',
        category_id: 'c1',
        size_id: 's1',
        brand_id: 'b1',
        colour_id: 'k1',
        fit_id: null,
        own_name: null,
      },
    ])
    expect(applyPendingGarmentTags([], [made])).toEqual([{ garment_id: 'g9', tag_id: 't1' }])
    expect(applyPending([], [made])[0]).toMatchObject({
      id: 'g9',
      type: 'garment',
      sync: 'pending',
    })
  })

  it('changes only the fields given, a fit cleared with null', () => {
    const [g] = applyPendingGarments(
      [garment('g1', 'b1')].map((x) => ({ ...x, fit_id: 'f1' })),
      [entry('wardrobe.update_garment', { p_id: 'g1', p_patch: { size_id: 's2', fit_id: null } })],
    )
    expect(g).toMatchObject({ size_id: 's2', fit_id: null, brand_id: 'b1' })
  })

  it('adds and takes off tags across several garments', () => {
    const rows = [{ garment_id: 'g1', tag_id: 't1' }]
    const added = applyPendingGarmentTags(rows, [
      entry('wardrobe.add_garment_tags', { p_garments: ['g1', 'g2'], p_tags: ['t1', 't2'] }),
    ])
    expect(added).toHaveLength(4)
    const removed = applyPendingGarmentTags(added, [
      entry('wardrobe.remove_garment_tags', { p_garments: ['g1', 'g2'], p_tags: ['t1'] }),
    ])
    expect(removed.map((t) => `${t.garment_id}:${t.tag_id}`)).toEqual(['g1:t2', 'g2:t2'])
  })
})
