import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { ItemFields } from './types'

/**
 * The only way the app changes data: each call queues one database function
 * (ADR-0042) and returns at once. Updates send only the fields given, so two
 * people's edits to different fields both survive (OFF-003).
 */
export function writes(queue: WriteQueue) {
  return {
    /** Creates an Item with an ID made here, returned straight away. */
    createItem(type: string, fields: ItemFields = {}): string {
      const id = newId()
      queue.enqueue('create_item', { p_id: id, p_type: type, p_fields: fields }, [id])
      return id
    },
    updateItem(id: string, patch: ItemFields): void {
      queue.enqueue('update_item', { p_id: id, p_patch: patch }, [id])
    },
    /** Delete means archive (ADR-0032). */
    archiveItem(id: string): void {
      queue.enqueue('archive_item', { p_id: id }, [id])
    },
    restoreItem(id: string): void {
      queue.enqueue('restore_item', { p_id: id }, [id])
    },
    linkItems(from: string, to: string, linkType: string): void {
      queue.enqueue(
        'link_items',
        { p_id: newId(), p_from: from, p_to: to, p_link_type: linkType },
        [from, to],
      )
    },
    unlinkItems(from: string, to: string, linkType: string): void {
      queue.enqueue('unlink_items', { p_from: from, p_to: to, p_link_type: linkType }, [from, to])
    },
  }
}

export type Writes = ReturnType<typeof writes>
