import { newId } from './ids'
import { sameName, type Label } from './labels'
import { nextPosition } from './subtasks'
import type { WriteQueue } from './queue/queue'
import type { RepeatArgs } from './series'
import type { ItemFields } from './types'

/**
 * The only way the app changes data: each call queues one database function
 * (ADR-0042) and returns at once. Updates send only the fields given, so two
 * people's edits to different fields both survive (OFF-003).
 */
export function writes(queue: WriteQueue, labelsNow: () => readonly Label[] = () => []) {
  return {
    /**
     * Creates an Item with an ID made here, returned straight away; or with
     * one made earlier, for an Item opened before it is kept (a new Note).
     */
    createItem(type: string, fields: ItemFields = {}, id: string = newId()): string {
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
    /** In place, keeping its id, links, Labels and Reminders (ITM-004). */
    convertItem(id: string, type: string): void {
      queue.enqueue('convert_item', { p_id: id, p_type: type }, [id])
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

    /** Makes a Label, or returns the one with that name already (ITM-005). */
    createLabel(name: string): string {
      const existing = labelsNow().find((l) => sameName(l.name, name))
      if (existing) return existing.id
      const id = newId()
      queue.enqueue('create_label', { p_id: id, p_name: name.trim() }, [])
      return id
    },
    renameLabel(id: string, name: string): void {
      queue.enqueue('rename_label', { p_id: id, p_name: name.trim() }, [])
    },
    /** It comes off every Note and Task; they are kept (ITM-005). */
    deleteLabel(id: string): void {
      queue.enqueue('delete_label', { p_id: id }, [])
    },
    addLabel(itemId: string, labelId: string): void {
      queue.enqueue('add_label', { p_item: itemId, p_label: labelId }, [itemId])
    },
    removeLabel(itemId: string, labelId: string): void {
      queue.enqueue('remove_label', { p_item: itemId, p_label: labelId }, [itemId])
    },

    /** A Reminder at a set time: a dated Thought's (CAP-004). */
    addFixedReminder(itemId: string, at: string): string {
      const id = newId()
      queue.enqueue('add_reminder', { p_id: id, p_item: itemId, p_fields: { fixed_at: at } }, [
        itemId,
      ])
      return id
    },

    removeReminder(itemId: string, id: string): void {
      queue.enqueue('remove_reminder', { p_id: id }, [itemId])
    },

    /** A line ticked inside a Task (TSK-006), after the others. */
    addSubtask(itemId: string, title: string): string {
      const id = newId()
      queue.enqueue(
        'add_subtask',
        { p_id: id, p_item: itemId, p_title: title, p_position: nextPosition() },
        [itemId],
      )
      return id
    },
    updateSubtask(itemId: string, id: string, patch: { title?: string; done?: boolean }): void {
      queue.enqueue('update_subtask', { p_id: id, p_patch: patch }, [itemId])
    },
    removeSubtask(itemId: string, id: string): void {
      queue.enqueue('remove_subtask', { p_id: id }, [itemId])
    },

    /**
     * Makes a Task repeat, or changes its repeat from it on, with the window
     * the device worked out (TSK-008, TSK-011, ADR-0045).
     */
    setRepeat(args: RepeatArgs): void {
      queue.enqueue('set_repeat', args, [args.p_item])
    },
    /** It is the last of its series (TSK-011). */
    stopRepeat(itemId: string): void {
      queue.enqueue('stop_repeat', { p_item: itemId }, [itemId])
    },
    /** Ticks a Task repeated after completion, making its next (TSK-009). */
    completeOccurrence(itemId: string, nextOn: string): string {
      const id = newId()
      queue.enqueue('complete_occurrence', { p_id: itemId, p_next: id, p_next_on: nextOn }, [
        itemId,
        id,
      ])
      return id
    },

    /** Pins a Note or stars a Task, for me alone. */
    setMark(itemId: string, on: boolean): void {
      queue.enqueue('set_mark', { p_item: itemId, p_on: on }, [itemId])
    },
  }
}

export type Writes = ReturnType<typeof writes>
