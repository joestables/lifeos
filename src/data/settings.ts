import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

export const settingsKey = ['settings'] as const

/** Mine, as Reminders and notifications use them (REM-007, REM-008). */
export interface Settings {
  timezone: string
  /** "09:00": a date-only Reminder's time, and when overdue nudges come. */
  defaultReminderTime: string
  /** Whether a dated Task reminds me on its do-on date. */
  taskReminders: boolean
  /** Whether a dated Thought reminds me. */
  thoughtReminders: boolean
  /** Whether an Event I make reminds me 30 minutes before (EVT-003). */
  eventReminders: boolean
  digestOn: boolean
  /** "07:00" */
  digestTime: string
  /** The Types I've hidden from Plan, on every device (PLN-004, ADR-0049). */
  planHiddenTypes: readonly string[]
  /** Where my new Meals go, and whose staples the Pantry shows; null for Personal (MPL-005). */
  mealSpaceId: string | null
}

/** Until my settings have loaded, or with no signal before they ever did. */
export const DEFAULT_SETTINGS: Settings = {
  timezone: 'Europe/London',
  defaultReminderTime: '09:00',
  taskReminders: true,
  thoughtReminders: true,
  eventReminders: true,
  digestOn: true,
  digestTime: '07:00',
  planHiddenTypes: [],
  mealSpaceId: null,
}

/** What core.update_settings takes. */
export interface SettingsPatch {
  default_reminder_time?: string
  reminder_defaults?: Record<string, boolean>
  digest_on?: boolean
  digest_time?: string
  plan_hidden_types?: string[]
  meal_space_id?: string | null
}

/**
 * My row of core.people. I read the people of my Households too (HSH-001),
 * so it is asked for by my id.
 */
export async function fetchSettings(me: string): Promise<Settings> {
  const { data, error } = await supabase()
    .from('people')
    .select(
      'timezone, default_reminder_time, reminder_defaults, digest_on, digest_time, plan_hidden_types, meal_space_id',
    )
    .eq('id', me)
    .limit(1)
  if (error) throw error
  const mine = data[0]
  if (!mine) return DEFAULT_SETTINGS
  const defaults = (mine.reminder_defaults ?? {}) as Record<string, boolean>
  return {
    timezone: mine.timezone || DEFAULT_SETTINGS.timezone,
    defaultReminderTime: mine.default_reminder_time.slice(0, 5),
    taskReminders: defaults.task !== false,
    thoughtReminders: defaults.thought !== false,
    eventReminders: defaults.event !== false,
    digestOn: mine.digest_on,
    digestTime: mine.digest_time.slice(0, 5),
    planHiddenTypes: mine.plan_hidden_types ?? [],
    mealSpaceId: mine.meal_space_id,
  }
}

/** Lays unsent changes to my settings over the ones the server last sent. */
export function applyPendingSettings(settings: Settings, entries: readonly QueueEntry[]): Settings {
  let out = settings
  for (const entry of entries) {
    if (entry.fn !== 'update_settings') continue
    const p = (entry.args as { p_patch: SettingsPatch }).p_patch
    out = {
      ...out,
      ...(p.default_reminder_time && { defaultReminderTime: p.default_reminder_time.slice(0, 5) }),
      ...(p.reminder_defaults?.task !== undefined && { taskReminders: p.reminder_defaults.task }),
      ...(p.reminder_defaults?.thought !== undefined && {
        thoughtReminders: p.reminder_defaults.thought,
      }),
      ...(p.reminder_defaults?.event !== undefined && {
        eventReminders: p.reminder_defaults.event,
      }),
      ...(p.digest_on !== undefined && { digestOn: p.digest_on }),
      ...(p.digest_time && { digestTime: p.digest_time.slice(0, 5) }),
      ...(p.plan_hidden_types && { planHiddenTypes: p.plan_hidden_types }),
      ...(p.meal_space_id !== undefined && { mealSpaceId: p.meal_space_id }),
    }
  }
  return out
}
