import { newId } from './ids'
import type { ListLineFields } from './lists'
import type { WriteQueue } from './queue/queue'

/**
 * A List's lines' writes (ADR-0042, ADR-0069): each queues one core
 * function and returns at once; ids are made here. A List itself is made,
 * renamed, moved and completed as any Item is (createItem, updateItem).
 */
export function listWrites(queue: WriteQueue) {
  return {
    /** A line, or a subheading (NTE-006 3). */
    addListLine(list: string, fields: ListLineFields, id = newId()): string {
      queue.enqueue('add_list_line', { p_id: id, p_list: list, p_fields: fields }, [list])
      return id
    },
    updateListLine(list: string, id: string, patch: ListLineFields): void {
      queue.enqueue('update_list_line', { p_id: id, p_patch: patch }, [list])
    },
    removeListLine(list: string, id: string): void {
      queue.enqueue('remove_list_line', { p_id: id }, [list])
    },
    /** Lines ticked or unticked (NTE-006 4). */
    tickListLines(list: string, ids: readonly string[], checked: boolean): void {
      queue.enqueue('tick_list_lines', { p_ids: [...ids], p_checked: checked }, [list])
    },
  }
}

export type ListWrites = ReturnType<typeof listWrites>
