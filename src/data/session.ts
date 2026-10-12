import { devicesKey, type Device } from './devices'
import { persister, queryClient } from './queryClient'
import type { WriteQueue } from './queue/queue'
import { supabase } from './supabase'

/**
 * Signing out (ACC-003). The caller first asks how many writes haven't been
 * sent and warns before going on; then the queue and every cached Item are
 * removed from the device.
 */
/**
 * Ends the session everywhere if the server can be reached; otherwise only
 * on this device, which is what signing out must always do.
 */
async function signOutOfSupabaseNow(): Promise<unknown> {
  const auth = supabase().auth
  const { error } = await auth.signOut()
  return error ? auth.signOut({ scope: 'local' }) : undefined
}

/**
 * Signing out stops this device's notifications (ACC-003): its push
 * subscription ends and it leaves my devices, so nothing more arrives here.
 * Best effort: with no signal the subscription still ends.
 */
async function forgetThisDevice(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    if (!sub) return
    const mine = queryClient
      .getQueryData<Device[]>(devicesKey)
      ?.find((d) => d.endpoint === sub.endpoint)
    if (mine) await supabase().rpc('remove_device', { p_id: mine.id })
    await sub.unsubscribe()
  } catch {
    // Signing out goes on regardless.
  }
}

export function session(queue: WriteQueue, signOutOfSupabase = signOutOfSupabaseNow) {
  return {
    unsentWrites: () => queue.entries().length,
    async signOut(): Promise<void> {
      await forgetThisDevice()
      await queue.clear()
      queryClient.clear()
      await persister.removeClient()
      await signOutOfSupabase()
    },
  }
}
