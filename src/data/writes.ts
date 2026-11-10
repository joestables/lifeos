import { newId } from './ids'
import { sameName, type Label } from './labels'
import { nextPosition } from './subtasks'
import type { WriteQueue } from './queue/queue'
import type { AlertFields } from './alerts'
import type { SettingsPatch } from './settings'
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
    /** In place, keeping its id, links, Labels and Alerts (ITM-004). */
    /**
     * Converts an Item in place (ITM-004). Into a Reminder, `alertAt` is the
     * time its first Alert is for, when its text names one (RMD-006 1).
     */
    convertItem(id: string, type: string, alertAt?: string): void {
      queue.enqueue(
        'convert_item',
        { p_id: id, p_type: type, ...(alertAt ? { p_alert_at: alertAt } : {}) },
        [id],
      )
    },
    linkItems(from: string, to: string, linkType: string): void {
      queue.enqueue(
        'link_items',
        { p_id: newId(), p_from: from, p_to: to, p_link_type: linkType },
        [from, to],
      )
    },
    /** A Google calendar's sync level (GCL-002); off takes its Events off Plan. */
    setCalendarLevel(link: string, level: 'off' | 'incoming' | 'two_way'): void {
      queue.enqueue('set_calendar_level', { p_link: link, p_level: level }, [])
    },
    /** My default calendar: the two-way one new Events go to, or none (GCL-002 2). */
    setNewEventsCalendar(link: string | null): void {
      // The generated types don't know an argument may be null.
      queue.enqueue('set_new_events_calendar', { p_link: link as string }, [])
    },
    /**
     * The calendar a new Event goes to, or none (GCL-005 1): written before
     * the Event itself, so it is never sent without it.
     */
    setEventCalendar(item: string, link: string | null): void {
      queue.enqueue('set_event_calendar', { p_item: item, p_link: link as string }, [item])
    },
    unlinkItems(from: string, to: string, linkType: string): void {
      queue.enqueue('unlink_items', { p_from: from, p_to: to, p_link_type: linkType }, [from, to])
    },

    /**
     * Makes a Label, or returns the one with that name already (ITM-005);
     * in a Space, for an Item there (a Label belongs to its Item's Space).
     */
    createLabel(name: string, space?: string | null): string {
      const existing = labelsNow().find(
        (l) => sameName(l.name, name) && (!space || !l.space_id || l.space_id === space),
      )
      if (existing) return existing.id
      const id = newId()
      queue.enqueue(
        'create_label',
        { p_id: id, p_name: name.trim(), ...(space ? { p_space_id: space } : {}) },
        [],
      )
      return id
    },
    renameLabel(id: string, name: string): void {
      queue.enqueue('rename_label', { p_id: id, p_name: name.trim() }, [])
    },
    /** It comes off every Item that has it; they are kept (ITM-005). */
    deleteLabel(id: string): void {
      queue.enqueue('delete_label', { p_id: id }, [])
    },
    addLabel(itemId: string, labelId: string): void {
      queue.enqueue('add_label', { p_item: itemId, p_label: labelId }, [itemId])
    },
    removeLabel(itemId: string, labelId: string): void {
      queue.enqueue('remove_label', { p_item: itemId, p_label: labelId }, [itemId])
    },

    /** An Alert at a set time: a dated Thought's (CAP-004). */
    addFixedAlert(itemId: string, at: string): string {
      const id = newId()
      queue.enqueue('add_alert', { p_id: id, p_item: itemId, p_fields: { fixed_at: at } }, [itemId])
      return id
    },

    /** At a fixed time, or relative to one of the Item's dates (REM-003). */
    addAlert(itemId: string, fields: AlertFields): string {
      const id = newId()
      queue.enqueue('add_alert', { p_id: id, p_item: itemId, p_fields: { ...fields } }, [itemId])
      return id
    },
    /** Changed, it is mine: it no longer follows the Type's default. */
    updateAlert(itemId: string, id: string, patch: AlertFields): void {
      queue.enqueue('update_alert', { p_id: id, p_patch: { ...patch } }, [itemId])
    },
    removeAlert(itemId: string, id: string): void {
      queue.enqueue('remove_alert', { p_id: id }, [itemId])
    },
    /**
     * The default the server made with a new Item, changed or removed in
     * New task or New event before Save (REM-002 1, EVT-003 1).
     */
    removeDefaultAlert(itemId: string): void {
      queue.enqueue('remove_default_alert', { p_item: itemId }, [itemId])
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

    /** My Alert defaults and morning digest (REM-007, REM-008). */
    updateSettings(patch: SettingsPatch): void {
      queue.enqueue('update_settings', { p_patch: { ...patch } }, [])
    },

    /** This device's push subscription, for me (REM-001). */
    registerDevice(subscription: {
      endpoint: string
      p256dh: string
      auth: string
      label: string
    }): string {
      const id = newId()
      queue.enqueue(
        'register_device',
        {
          p_id: id,
          p_endpoint: subscription.endpoint,
          p_p256dh: subscription.p256dh,
          p_auth: subscription.auth,
          p_label: subscription.label,
        },
        [],
      )
      return id
    },
    setDevice(id: string, enabled: boolean): void {
      queue.enqueue('set_device', { p_id: id, p_enabled: enabled }, [])
    },
    removeDevice(id: string): void {
      queue.enqueue('remove_device', { p_id: id }, [])
    },

    /** Pins a Note or stars a Task, for me alone. */
    setMark(itemId: string, on: boolean): void {
      queue.enqueue('set_mark', { p_item: itemId, p_on: on }, [itemId])
    },
  }
}

export type Writes = ReturnType<typeof writes>
