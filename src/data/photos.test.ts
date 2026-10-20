import { describe, expect, it } from 'vitest'
import { photoSizes } from '@/lib/photo-resize'
import { applyPendingPhotos, type Photo } from './photos'
import type { QueueEntry } from './queue/store'

const entry = (fn: string, args: Record<string, unknown>) =>
  ({
    id: fn,
    fn,
    args,
    itemIds: [],
    createdAt: 0,
    attempts: 0,
    state: 'pending',
  }) as unknown as QueueEntry

describe('ADR-0052: photos', () => {
  it('is no larger than 1600px on its longest side, then smaller each try', () => {
    expect(photoSizes(4000, 3000, 3)).toEqual([
      { width: 1600, height: 1200 },
      { width: 1280, height: 960 },
      { width: 1024, height: 768 },
    ])
    expect(photoSizes(800, 600, 1)).toEqual([{ width: 800, height: 600 }])
  })

  it('RCP-006 3: a new photo shows at once in place of the old; removed, it goes', () => {
    const old: Photo = { id: 'a', item_id: 'r', path: 'r/a.webp', width: 1, height: 1 }
    const set = entry('set_photo', { p_id: 'b', p_item: 'r', p_width: 800, p_height: 600 })
    expect(applyPendingPhotos([old], [set])).toEqual([
      { id: 'b', item_id: 'r', path: 'r/b.webp', width: 800, height: 600 },
    ])
    expect(applyPendingPhotos([old], [set, entry('remove_photo', { p_item: 'r' })])).toEqual([])
  })
})
