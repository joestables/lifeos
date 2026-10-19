/**
 * The data layer (ADR-0042): the only code that talks to Supabase. Screens
 * use what this exports.
 */
import type { QueryKey } from '@tanstack/react-query'
import { foldSent, itemsKey } from './items'
import {
  applyPendingItemLabels,
  applyPendingLabels,
  applyPendingMarks,
  itemLabelsKey,
  labelsKey,
  marksKey,
  type Label,
} from './labels'
import {
  applyPendingCalendar,
  calendarAction as askCalendar,
  calendarKey,
  type Calendar,
} from './calendar'
import { applyPendingLinks, linksKey, type Link } from './links'
import {
  applyPendingCooks,
  applyPendingLines,
  applyPendingPantry,
  applyPendingRecipes,
  applyPendingSteps,
  applyPendingValues,
  applyPendingVariations,
  cooksKey,
  linesKey,
  pantryKey,
  recipesKey,
  stepsKey,
  valuesKey,
  variationsKey,
  type Cook,
  type FoodValue,
  type Line,
  type PantryEntry,
  type RecipeHeading,
  type Step,
  type VariationFields,
} from './food'
import { foodWrites } from './food-writes'
import { queryClient } from './queryClient'
import { applyPendingReminders, remindersKey, type Reminder } from './reminders'
import { applyPendingSeries, seriesKey, type Series } from './series'
import { applyPendingSettings, settingsKey, type Settings } from './settings'
import { applyPendingDevices, devicesKey, type Device } from './devices'
import { applyPendingSubtasks, subtasksKey, type Subtask } from './subtasks'
import { indexedDbQueueStore, WriteQueue } from './queue'
import type { QueueEntry } from './queue/store'
import { session } from './session'
import { reportEvent } from './report'
import { rpcTransport } from './supabase'
import type { ItemRow, WriteFn } from './types'
import { writes } from './writes'

/**
 * Each cached collection, the writes that change it, and how a sent write is
 * folded in, so nothing flickers before the refetch.
 */
const collections: {
  key: QueryKey
  fns: WriteFn[]
  fold: (rows: never, e: QueueEntry) => unknown
}[] = [
  {
    // Before Items: a series is laid over the Items as they were.
    key: seriesKey,
    fns: ['set_repeat', 'stop_repeat'],
    fold: (rows: Series[], e: QueueEntry) =>
      applyPendingSeries(rows, [e], queryClient.getQueryData<ItemRow[]>(itemsKey) ?? []),
  },
  {
    key: itemsKey,
    fns: [
      'create_item',
      'update_item',
      'archive_item',
      'restore_item',
      'convert_item',
      'set_repeat',
      'stop_repeat',
      'complete_occurrence',
      // A calendar turned off takes its Events off Plan (GCL-002 3).
      'set_calendar_level',
      // A Recipe's state is worked out by the server from its Variations'.
      'food.create_recipe',
      'food.add_variation',
    ],
    fold: (rows: ItemRow[], e: QueueEntry) => foldSent(rows, e),
  },
  {
    key: calendarKey,
    fns: ['set_calendar_level', 'set_new_events_calendar'],
    fold: (cal: Calendar, e: QueueEntry) => applyPendingCalendar(cal, [e]),
  },
  {
    key: labelsKey,
    fns: ['create_label', 'rename_label', 'delete_label'],
    fold: (rows: Label[], e: QueueEntry) => applyPendingLabels(rows, [e]),
  },
  {
    key: itemLabelsKey,
    fns: [
      'add_label',
      'remove_label',
      'delete_label',
      'convert_item',
      'set_repeat',
      'complete_occurrence',
    ],
    fold: (rows: Parameters<typeof applyPendingItemLabels>[0], e: QueueEntry) =>
      applyPendingItemLabels(rows, [e]),
  },
  {
    key: remindersKey,
    // A Task's default Reminder is made and moved by the server with its dates.
    fns: [
      'add_reminder',
      'update_reminder',
      'remove_reminder',
      'update_settings',
      'create_item',
      'update_item',
      'convert_item',
      'set_repeat',
      'stop_repeat',
      'complete_occurrence',
    ],
    fold: (rows: Reminder[], e: QueueEntry) => applyPendingReminders(rows, [e]),
  },
  {
    key: recipesKey,
    fns: ['food.create_recipe', 'food.update_recipe'],
    fold: (rows: RecipeHeading[], e: QueueEntry) => applyPendingRecipes(rows, [e]),
  },
  {
    key: variationsKey,
    fns: ['food.create_recipe', 'food.add_variation', 'food.update_variation'],
    fold: (rows: VariationFields[], e: QueueEntry) => applyPendingVariations(rows, [e]),
  },
  {
    key: linesKey,
    fns: ['food.add_variation', 'food.add_line', 'food.update_line', 'food.remove_line'],
    fold: (rows: Line[], e: QueueEntry) => applyPendingLines(rows, [e]),
  },
  {
    key: stepsKey,
    fns: ['food.add_variation', 'food.add_step', 'food.update_step', 'food.remove_step'],
    fold: (rows: Step[], e: QueueEntry) => applyPendingSteps(rows, [e]),
  },
  {
    key: cooksKey,
    fns: ['food.log_cook', 'food.update_cook', 'food.remove_cook'],
    fold: (rows: Cook[], e: QueueEntry) => applyPendingCooks(rows, [e], ''),
  },
  {
    key: pantryKey,
    fns: ['food.add_pantry'],
    fold: (rows: PantryEntry[], e: QueueEntry) => applyPendingPantry(rows, [e], ''),
  },
  {
    key: valuesKey,
    fns: ['food.add_value', 'food.rename_value', 'food.remove_value'],
    fold: (rows: FoodValue[], e: QueueEntry) => applyPendingValues(rows, [e], ''),
  },
  {
    key: linksKey,
    fns: ['link_items', 'unlink_items', 'food.create_recipe', 'food.add_variation'],
    fold: (rows: Link[], e: QueueEntry) => applyPendingLinks(rows, [e]),
  },
  {
    key: subtasksKey,
    fns: ['add_subtask', 'update_subtask', 'remove_subtask'],
    fold: (rows: Subtask[], e: QueueEntry) => applyPendingSubtasks(rows, [e]),
  },
  {
    key: settingsKey,
    fns: ['update_settings'],
    fold: (settings: Settings, e: QueueEntry) => applyPendingSettings(settings, [e]),
  },
  {
    key: devicesKey,
    fns: ['register_device', 'set_device', 'remove_device'],
    fold: (rows: Device[], e: QueueEntry) => applyPendingDevices(rows, [e]),
  },
  {
    key: marksKey,
    fns: ['set_mark', 'convert_item'],
    fold: (rows: Parameters<typeof applyPendingMarks>[0], e: QueueEntry) =>
      applyPendingMarks(rows, [e]),
  },
]

export const queue = new WriteQueue({
  store: indexedDbQueueStore(),
  transport: rpcTransport,
  onSent: (entry) => {
    for (const c of collections) {
      if (!c.fns.includes(entry.fn)) continue
      queryClient.setQueryData(c.key, (old: never) => old && c.fold(old, entry))
      void queryClient.invalidateQueries({ queryKey: c.key })
    }
    // A Recipe's log follows what was changed (RCP-013); only an open one refetches.
    if (entry.fn.startsWith('food.') || entry.fn.endsWith('_item'))
      void queryClient.invalidateQueries({ queryKey: ['core', 'activity'] })
  },
  // Recorded without the Item's content: only which function failed (OFF-004).
  onRejected: (entry, error) =>
    void reportEvent('write_refused', error.message, { fn: entry.fn, attempts: entry.attempts }),
})

const labelsNow = () =>
  applyPendingLabels(queryClient.getQueryData<Label[]>(labelsKey) ?? [], queue.entries())

export const {
  createItem,
  updateItem,
  archiveItem,
  restoreItem,
  convertItem,
  linkItems,
  unlinkItems,
  createLabel,
  renameLabel,
  deleteLabel,
  addLabel,
  removeLabel,
  setMark,
  addFixedReminder,
  addReminder,
  updateReminder,
  removeReminder,
  updateSettings,
  registerDevice,
  setDevice,
  removeDevice,
  addSubtask,
  updateSubtask,
  removeSubtask,
  setCalendarLevel,
  setNewEventsCalendar,
  setEventCalendar,
  setRepeat,
  stopRepeat,
  completeOccurrence,
} = writes(queue, labelsNow)

export const {
  createRecipe,
  updateRecipe,
  addVariation,
  updateVariation,
  addLine,
  updateLine,
  removeLine,
  addStep,
  updateStep,
  removeStep,
  logCook,
  updateCook,
  removeCook,
  addPantry,
  addValue,
} = foodWrites(queue)

export const { unsentWrites, signOut } = session(queue)

/**
 * Clears the changes the server refused, once I've seen them (OFF-004 2):
 * each Item shows what was saved again.
 */
export async function clearRefused(): Promise<void> {
  for (const e of queue.entries()) if (e.state === 'failed') await queue.discard(e.id)
}

export { authReady, signInWithGoogle, useAuth, type Me } from './auth'
export {
  useCalendar,
  useDeletedItems,
  useDevices,
  useItem,
  useItems,
  useLabels,
  useLinks,
  useMarks,
  useOnline,
  useQueueEntries,
  useReminders,
  useSeries,
  useSettings,
  useSubtasks,
  useSyncCounts,
} from './hooks'
export { googleEventUrl } from './calendar'
export { useFood, useRecipeActivity, type FoodData } from './food-hooks'
export { positionBetween, positionsFor } from './food-writes'
export type {
  Activity,
  Cook,
  FoodValue,
  HeadingPatch,
  Line,
  LineFields,
  PantryEntry,
  RecipeHeading,
  Step,
  ValueKind,
  VariationFields,
  VariationPatch,
} from './food'
export type { Calendar, CalendarLink, Connection, ExternalRef } from './calendar'
export { newId } from './ids'
export { searchItemIds, searchKey } from './search'
export type { Label } from './labels'
export type { Link } from './links'
export { noteAction, reportEvent, startReporting } from './report'
export type { Reminder, ReminderFields } from './reminders'
export type { Device } from './devices'
export { fetchVapidPublicKey } from './devices'
export type { RepeatArgs, RepeatMode, Series, SeriesTemplate } from './series'
export type { Settings, SettingsPatch } from './settings'
export type { Subtask } from './subtasks'
export type { Item, ItemFields, SyncState } from './types'

/**
 * Asks Google Calendar's Edge Function as me (GCL-001, ADR-0047): start
 * connecting, finish it, disconnect, or sync now; then what it changed is
 * read again.
 */
export async function calendarAction(
  action: 'start' | 'finish' | 'disconnect' | 'sync',
  extra?: string,
) {
  const answer = await askCalendar(action, extra)
  if (action !== 'start') {
    void queryClient.invalidateQueries({ queryKey: calendarKey })
    if (!answer.skipped) void queryClient.invalidateQueries({ queryKey: itemsKey })
  }
  return answer
}
