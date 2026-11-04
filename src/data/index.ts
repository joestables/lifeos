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
  applyPendingMeals,
  applyPendingMealLines,
  applyPendingPantry,
  applyPendingEntries,
  applyPendingViews,
  applyPendingRecipes,
  applyPendingSteps,
  applyPendingValues,
  applyPendingVariations,
  cooksKey,
  linesKey,
  mealsKey,
  mealLinesKey,
  pantryKey,
  recipesKey,
  spaceEntriesKey,
  recentViewsKey,
  stepsKey,
  valuesKey,
  variationsKey,
  type Cook,
  type FoodValue,
  type Line,
  type MealRow,
  type MealLine,
  type PantryEntry,
  type RecipeHeading,
  type SpaceEntry,
  type RecentView,
  type Step,
  type VariationFields,
} from './food'
import { foodWrites } from './food-writes'
import {
  applyPendingEquipment,
  applyPendingExerciseMuscles,
  applyPendingExercises,
  applyPendingGymSettings,
  applyPendingMuscleGroups,
  applyPendingMuscleSettings,
  equipmentKey,
  exerciseMusclesKey,
  exercisesKey,
  gymSettingsKey,
  muscleGroupsKey,
  muscleSettingsKey,
  applyPendingTemplateLines,
  templateLinesKey,
  type TemplateLine,
  applyPendingWorkouts,
  applyPendingEntries as applyPendingWorkoutEntries,
  applyPendingSets,
  workoutsKey,
  entriesKey,
  setsKey,
  type WorkoutRow,
  type EntryRow,
  type SetRow,
  type Equipment,
  type ExerciseMuscle,
  type ExerciseRow,
  type GymSettings,
  type MuscleGroup,
  type MuscleSettingsRow,
} from './fitness'
import { fitnessWrites, templateWrites, workoutWrites } from './fitness-writes'
import {
  applyPendingListMeals,
  applyPendingLists,
  applyPendingShopLines,
  listMealsKey,
  listsKey,
  shopLinesKey,
  type ListDetail,
  type ListMeal,
  type ShopLine,
} from './shopping'
import { shoppingWrites } from './shopping-writes'
import { applyPendingPhotos, photosKey, photoWrites, type Photo } from './photos'
import { queryClient } from './queryClient'
import { applyPendingReminders, remindersKey, type Reminder } from './reminders'
import { applyPendingSeries, seriesKey, type Series } from './series'
import { applyPendingSettings, settingsKey, type Settings } from './settings'
import { applyPendingDevices, devicesKey, type Device } from './devices'
import { applyPendingSubtasks, subtasksKey, type Subtask } from './subtasks'
import {
  applyPendingHouseholds,
  applyPendingMyInvites,
  applyPendingSentInvites,
  householdsKey,
  householdWrites,
  myInvitesKey,
  PARTING_FNS,
  sentInvitesKey,
  type Household,
  type MyInvite,
  type SentInvite,
} from './households'
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
      'food.plan_meal',
      'shopping.create_list',
      'fitness.create_exercise',
      'fitness.update_exercise',
      'fitness.archive_exercise',
      'fitness.create_template',
      'fitness.plan_workout',
      'fitness.update_workout',
      'fitness.start_workout',
      'fitness.end_workout',
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
      'remove_default_reminder',
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
    fns: ['food.create_recipe', 'food.update_recipe', 'food.move_value_uses'],
    fold: (rows: RecipeHeading[], e: QueueEntry) => applyPendingRecipes(rows, [e]),
  },
  {
    key: variationsKey,
    fns: ['food.create_recipe', 'food.add_variation', 'food.update_variation'],
    fold: (rows: VariationFields[], e: QueueEntry) => applyPendingVariations(rows, [e]),
  },
  {
    key: linesKey,
    fns: [
      'food.add_variation',
      'food.add_line',
      'food.update_line',
      'food.remove_line',
      'food.merge_pantry',
    ],
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
    key: photosKey,
    fns: ['set_photo', 'remove_photo'],
    fold: (rows: Photo[], e: QueueEntry) => applyPendingPhotos(rows, [e]),
  },
  {
    key: pantryKey,
    // A line's unit may become its entry's default (PAN-004 3): refetched after.
    fns: [
      'food.add_pantry',
      'food.update_pantry',
      'food.remove_pantry',
      'food.merge_pantry',
      'food.add_line',
      'food.update_line',
      'food.add_meal_line',
      'food.update_meal_line',
    ],
    fold: (rows: PantryEntry[], e: QueueEntry) => applyPendingPantry(rows, [e], ''),
  },
  {
    key: mealsKey,
    fns: ['food.plan_meal', 'food.update_meal'],
    fold: (rows: MealRow[], e: QueueEntry) => applyPendingMeals(rows, [e]),
  },
  {
    key: mealLinesKey,
    fns: [
      'food.add_meal_line',
      'food.update_meal_line',
      'food.remove_meal_line',
      'food.merge_pantry',
      // A past Meal's lines become typed as their entry goes (PAN-001 4).
      'food.remove_pantry',
    ],
    fold: (rows: MealLine[], e: QueueEntry) => applyPendingMealLines(rows, [e]),
  },
  {
    key: spaceEntriesKey,
    // A tick clears out of stock or Required (SHP-003 4): refetched after.
    fns: [
      'food.keep_entry',
      'food.remove_entry',
      'food.remove_pantry',
      'food.merge_pantry',
      'shopping.tick',
      'create_household',
    ],
    fold: (rows: SpaceEntry[], e: QueueEntry) => applyPendingEntries(rows, [e]),
  },
  {
    key: recentViewsKey,
    fns: ['food.view_recipe'],
    fold: (rows: RecentView[], e: QueueEntry) => applyPendingViews(rows, [e]),
  },
  {
    key: listsKey,
    fns: ['shopping.create_list', 'shopping.update_list', 'convert_item'],
    fold: (rows: ListDetail[], e: QueueEntry) => applyPendingLists(rows, [e]),
  },
  {
    key: listMealsKey,
    fns: ['shopping.create_list', 'shopping.add_meals', 'shopping.remove_meal'],
    fold: (rows: ListMeal[], e: QueueEntry) => applyPendingListMeals(rows, [e]),
  },
  {
    key: shopLinesKey,
    // A Meal's lines are written by the server as the Meal changes (ADR-0057).
    fns: [
      'shopping.create_list',
      'shopping.add_meals',
      'shopping.remove_meal',
      'shopping.add_line',
      'shopping.update_line',
      'shopping.delete_line',
      'shopping.tick',
      'food.update_meal',
      'food.add_meal_line',
      'food.update_meal_line',
      'food.remove_meal_line',
      'food.set_meal_variation',
      'food.add_line',
      'food.update_line',
      'food.remove_line',
      'food.update_variation',
      'food.remove_pantry',
      'food.merge_pantry',
      'update_item',
      'archive_item',
      'restore_item',
    ],
    fold: (rows: ShopLine[], e: QueueEntry) => applyPendingShopLines(rows, [e]),
  },
  {
    key: valuesKey,
    // A Recipe brought back puts its names back on my lists: refetched after.
    fns: ['food.add_value', 'food.rename_value', 'food.remove_value', 'restore_item'],
    fold: (rows: FoodValue[], e: QueueEntry) => applyPendingValues(rows, [e], ''),
  },
  {
    key: linksKey,
    fns: [
      'link_items',
      'unlink_items',
      'food.create_recipe',
      'food.add_variation',
      'food.plan_meal',
      'food.set_meal_variation',
      'fitness.plan_workout',
    ],
    fold: (rows: Link[], e: QueueEntry) => applyPendingLinks(rows, [e]),
  },
  {
    key: equipmentKey,
    fns: ['fitness.save_equipment', 'fitness.remove_equipment'],
    fold: (rows: Equipment[], e: QueueEntry) => applyPendingEquipment(rows, [e]),
  },
  {
    key: muscleGroupsKey,
    fns: ['fitness.save_muscle_group', 'fitness.remove_muscle_group'],
    fold: (rows: MuscleGroup[], e: QueueEntry) => applyPendingMuscleGroups(rows, [e], ''),
  },
  {
    key: muscleSettingsKey,
    fns: ['fitness.set_muscle_settings'],
    fold: (rows: MuscleSettingsRow[], e: QueueEntry) => applyPendingMuscleSettings(rows, [e]),
  },
  {
    key: gymSettingsKey,
    fns: ['fitness.update_settings'],
    fold: (settings: GymSettings, e: QueueEntry) => applyPendingGymSettings(settings, [e]),
  },
  {
    key: exercisesKey,
    fns: ['fitness.create_exercise', 'fitness.update_exercise'],
    fold: (rows: ExerciseRow[], e: QueueEntry) => applyPendingExercises(rows, [e]),
  },
  {
    key: exerciseMusclesKey,
    fns: [
      'fitness.create_exercise',
      'fitness.set_primary_muscle',
      'fitness.set_secondary_muscle',
      'fitness.remove_secondary_muscle',
    ],
    fold: (rows: ExerciseMuscle[], e: QueueEntry) => applyPendingExerciseMuscles(rows, [e]),
  },
  {
    key: templateLinesKey,
    fns: [
      'fitness.add_template_exercise',
      'fitness.update_template_exercise',
      'fitness.remove_template_exercise',
    ],
    fold: (rows: TemplateLine[], e: QueueEntry) => applyPendingTemplateLines(rows, [e]),
  },
  {
    key: workoutsKey,
    // Discard ends a workout on the server (GYM-012 7): refetched after.
    fns: [
      'fitness.plan_workout',
      'fitness.start_workout',
      'fitness.end_workout',
      'fitness.update_workout',
      'archive_item',
      'restore_item',
    ],
    fold: (rows: WorkoutRow[], e: QueueEntry) => applyPendingWorkouts(rows, [e]),
  },
  {
    key: entriesKey,
    // The server takes each entry's snapshot (ADR-0013): refetched after.
    fns: [
      'fitness.add_entry',
      'fitness.begin_entry',
      'fitness.swap_entry',
      'fitness.remove_entry',
      'fitness.mark_entry_done',
      'fitness.start_workout',
    ],
    fold: (rows: EntryRow[], e: QueueEntry) => applyPendingWorkoutEntries(rows, [e]),
  },
  {
    key: setsKey,
    fns: ['fitness.log_set', 'fitness.update_set', 'fitness.remove_set'],
    fold: (rows: SetRow[], e: QueueEntry) => applyPendingSets(rows, [e]),
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
    key: householdsKey,
    fns: [
      'create_household',
      'rename_household',
      'join_household',
      'leave_household',
      'remove_member',
      'delete_household',
    ],
    fold: (rows: Household[], e: QueueEntry) =>
      applyPendingHouseholds(rows, [e], '', queryClient.getQueryData<MyInvite[]>(myInvitesKey)),
  },
  {
    key: sentInvitesKey,
    fns: ['invite', 'withdraw_invite', 'delete_household'],
    fold: (rows: SentInvite[], e: QueueEntry) => applyPendingSentInvites(rows, [e]),
  },
  {
    key: myInvitesKey,
    fns: ['join_household', 'decline_invite'],
    fold: (rows: MyInvite[], e: QueueEntry) => applyPendingMyInvites(rows, [e]),
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
    // Joining or parting moves what I see between Spaces (HSH-004): all of it is fetched again.
    if (PARTING_FNS.includes(entry.fn)) void queryClient.invalidateQueries()
    // A shop's Meals by name, day and slot follow what was sent (SHP-002).
    if (
      entry.fn.startsWith('shopping.') ||
      entry.fn === 'food.update_meal' ||
      entry.fn === 'update_item'
    )
      void queryClient.invalidateQueries({ queryKey: ['shopping', 'meals_of'] })
    if (entry.fn === 'food.note_change')
      void queryClient.invalidateQueries({ queryKey: ['food', 'change_notes'] })
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
  removeDefaultReminder,
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
  updatePantry,
  removePantry,
  mergePantry,
  keepEntry,
  removeEntry,
  viewRecipe,
  planMeal,
  updateMeal,
  addMealLine,
  updateMealLine,
  removeMealLine,
  setMealVariation,
  addValue,
  renameValue,
  mergeValue,
  removeValue,
  noteChange,
} = foodWrites(queue)

export const {
  createList,
  updateList,
  addMeals,
  removeMeal,
  addShopLine,
  updateShopLine,
  deleteShopLine,
  tick,
} = shoppingWrites(queue)

export const { setPhoto, removePhoto } = photoWrites(queue)

export const {
  saveEquipment,
  removeEquipment,
  saveMuscleGroup,
  removeMuscleGroup,
  setMuscleSettings,
  updateGymSettings,
  createExercise,
  updateExercise,
  setPrimaryMuscle,
  setSecondaryMuscle,
  removeSecondaryMuscle,
  archiveExercise,
} = fitnessWrites(queue)

export const {
  createTemplate,
  addTemplateExercise,
  updateTemplateExercise,
  removeTemplateExercise,
  duplicateTemplate,
} = templateWrites(queue)

export const {
  planWorkout,
  updateWorkout,
  changeWorkoutTemplate,
  startWorkout,
  addEntry,
  beginEntry,
  swapEntry,
  removeEntry: removeWorkoutEntry,
  markEntryDone,
  logSet,
  updateSet,
  removeSet,
  endWorkout,
} = workoutWrites(queue)

export const {
  createHousehold,
  renameHousehold,
  invite,
  withdrawInvite,
  joinHousehold,
  declineInvite,
  leaveHousehold,
  removeMember,
  deleteHousehold,
} = householdWrites(queue)

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
export {
  fillFromMethod,
  importRecipe,
  mealIngredients,
  linkPicture,
  linkPreview,
  keepImport,
  useAiStatus,
  type KeptImport,
} from './ai'
export {
  useFood,
  useFoodSpaces,
  useMeals,
  usePantryInUse,
  useRecentViews,
  useRecipeActivity,
  type FoodData,
  type FoodSpaces,
  type MealView,
} from './food-hooks'
export { positionBetween, positionsFor } from './food-writes'
export {
  autoLineId,
  useShopMeals,
  useShopping,
  type ListLine,
  type ShoppingData,
  type ShoppingList,
} from './shopping-hooks'
export { deleteIsMine, liveKeys, useLiveShopping } from './live'
export type { ListFields, ShopLine, ShopLineFields, ShopMeal } from './shopping'
export {
  useHouseholds,
  type Household,
  type HouseholdsData,
  type Member,
  type MyInvite,
  type SentInvite,
} from './households'
export { usePhotoUrls, type Photo } from './photos'
export type {
  Activity,
  Cook,
  FoodValue,
  HeadingPatch,
  Line,
  LineFields,
  MealFields,
  MealLine,
  MealLineFields,
  PantryEntry,
  PantryFields,
  RecipeHeading,
  SpaceEntry,
  Step,
  ValueKind,
  VariationFields,
  VariationPatch,
} from './food'
export { savedSource } from './food'
export {
  useGym,
  type EquipmentView,
  type ExerciseView,
  type GymData,
  type TemplateView,
  type WorkoutView,
  type EntryView,
  type SetView,
} from './fitness-hooks'
export {
  CATEGORIES,
  type GymSettings,
  type GymSettingsPatch,
  type MuscleCategory,
  type MuscleView,
} from './fitness'
export type { ExercisePatch, NewExercise, SetFields } from './fitness-writes'
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
