import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { queryClient } from './queryClient'
import { supabase } from './supabase'

/** A phone or computer I turned notifications on for (REM-001). */
export type Device = Pick<
  Database['core']['Tables']['push_devices']['Row'],
  'id' | 'endpoint' | 'label' | 'enabled' | 'gone_at' | 'created_at' | 'last_sent_at'
>

export const devicesKey = ['devices'] as const

export async function fetchDevices(): Promise<Device[]> {
  const { data, error } = await supabase()
    .from('push_devices')
    .select('id, endpoint, label, enabled, gone_at, created_at, last_sent_at')
    .order('created_at')
  if (error) throw error
  return data
}

/** The key a device subscribes with: public, made by the sender (ADR-0044). */
export async function fetchVapidPublicKey(): Promise<string | null> {
  const { data, error } = await supabase().rpc('vapid_public_key')
  if (error) throw error
  return data
}

/**
 * The Android app as my device, at once rather than through the write queue
 * (turning notifications on needs signal anyway): its FCM token registered,
 * and a new secret it keeps to read its Reminders and act on them
 * (REM-001 4, REM-010, ADR-0063).
 */
export async function registerAndroidDevice(
  token: string,
  label: string,
): Promise<{ id: string; secret: string }> {
  const { data: device, error } = await supabase().rpc('register_fcm_device', {
    p_id: crypto.randomUUID(),
    p_token: token,
    p_label: label,
  })
  if (error) throw error
  const { data: secret, error: secretError } = await supabase().rpc('device_secret', {
    p_device: device.id,
  })
  if (secretError) throw secretError
  void queryClient.invalidateQueries({ queryKey: devicesKey })
  return { id: device.id, secret }
}

/** Lays unsent device changes over the devices the server last sent. */
export function applyPendingDevices(
  rows: readonly Device[],
  entries: readonly QueueEntry[],
): Device[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as Record<string, unknown>
    switch (entry.fn) {
      case 'register_device':
      case 'register_fcm_device': {
        // The endpoint is the device (the Android app's is its FCM token,
        // registered directly since 0.1.3; one 0.1.2 queued is still laid
        // over): registering it again turns it back on.
        const endpoint = String(entry.fn === 'register_fcm_device' ? a.p_token : a.p_endpoint)
        const existing = out.find((d) => d.endpoint === endpoint)
        if (existing) {
          out = out.map((d) =>
            d === existing ? { ...d, enabled: true, gone_at: null, label: String(a.p_label) } : d,
          )
          break
        }
        out.push({
          id: String(a.p_id),
          endpoint,
          label: String(a.p_label),
          enabled: true,
          gone_at: null,
          created_at: new Date(entry.createdAt).toISOString(),
          last_sent_at: null,
        })
        break
      }
      case 'set_device':
        out = out.map((d) => (d.id === a.p_id ? { ...d, enabled: Boolean(a.p_enabled) } : d))
        break
      case 'remove_device':
        out = out.filter((d) => d.id !== a.p_id)
        break
    }
  }
  return out
}
