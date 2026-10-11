import { supabase } from './supabase'

export const settingsKey = ['settings'] as const

/** Mine, as Reminders use them (REM-007). */
export interface Settings {
  timezone: string
  /** "09:00" */
  defaultReminderTime: string
}

/** Until my settings have loaded, or with no signal before they ever did. */
export const DEFAULT_SETTINGS: Settings = {
  timezone: 'Europe/London',
  defaultReminderTime: '09:00',
}

/** My row of core.people: the only one I can read. */
export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase()
    .from('people')
    .select('timezone, default_reminder_time')
    .limit(1)
  if (error) throw error
  const me = data[0]
  if (!me) return DEFAULT_SETTINGS
  return {
    timezone: me.timezone || DEFAULT_SETTINGS.timezone,
    defaultReminderTime: me.default_reminder_time.slice(0, 5),
  }
}
