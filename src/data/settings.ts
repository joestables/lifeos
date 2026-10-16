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
}

/** What core.update_settings takes. */
export interface SettingsPatch {
  default_reminder_time?: string
  reminder_defaults?: Record<string, boolean>
  digest_on?: boolean
  digest_time?: string
}

/** My row of core.people: the only one I can read. */
export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase()
    .from('people')
    .select('timezone, default_reminder_time, reminder_defaults, digest_on, digest_time')
    .limit(1)
  if (error) throw error
  const me = data[0]
  if (!me) return DEFAULT_SETTINGS
  const defaults = (me.reminder_defaults ?? {}) as Record<string, boolean>
  return {
    timezone: me.timezone || DEFAULT_SETTINGS.timezone,
    defaultReminderTime: me.default_reminder_time.slice(0, 5),
    taskReminders: defaults.task !== false,
    thoughtReminders: defaults.thought !== false,
    eventReminders: defaults.event !== false,
    digestOn: me.digest_on,
    digestTime: me.digest_time.slice(0, 5),
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
    }
  }
  return out
}
