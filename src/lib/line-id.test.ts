import { describe, expect, it } from 'vitest'
import { mealLineId } from './line-id'

describe('SHP-004 3: a Meal line’s id, as the server gives it', () => {
  it('is MD5 of "list:meal:source", as shopping_private.line_id makes it', () => {
    // The same id Postgres gives, in meal_line_ids_test.
    expect(
      mealLineId(
        '00000000-0000-7000-8000-000000000021',
        '00000000-0000-7000-8000-000000000011',
        '00000000-0000-7000-8000-0000000000d1',
      ),
    ).toBe('4e544205-b123-98de-a9b9-0e38b01601e0')
  })
  it('hashes as MD5 does, whatever the text', async () => {
    const { md5 } = await import('./line-id')
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('é:x')).toBe('ad1deba156a9ac79f602b431ed680f3a')
  })
  it('differs for another Meal of the same Variation', () => {
    const list = '00000000-0000-7000-8000-000000000021'
    expect(
      mealLineId(
        list,
        '00000000-0000-7000-8000-000000000011',
        '00000000-0000-7000-8000-0000000000d1',
      ),
    ).not.toBe(
      mealLineId(
        list,
        '00000000-0000-7000-8000-000000000012',
        '00000000-0000-7000-8000-0000000000d2',
      ),
    )
  })
})
