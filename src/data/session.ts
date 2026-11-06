import { forgetPhotos, forgetStorage } from './device-owner'
import { devicesKey, type Device } from './devices'
import { persister, queryClient } from './queryClient'
import type { WriteQueue } from './queue/queue'
import { isAndroidApp } from '@/native/platform'
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
    if (isAndroidApp()) {
      // The Android app is its FCM token (ADR-0063): it leaves my devices,
      // and the token ends, so nothing sent to it arrives.
      const { LifeosNative } = await import('@/native/lifeos')
      const { state, token } = await LifeosNative.notificationsState()
      const mine =
        state === 'granted' &&
        queryClient.getQueryData<Device[]>(devicesKey)?.find((d) => d.endpoint === token)
      if (mine) await supabase().rpc('remove_device', { p_id: mine.id })
      await LifeosNative.resetNotifications()
      return
    }
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

/**
 * Everything the device keeps for whoever used it: the write queue, the
 * cached Items, the photos kept for offline, and what pages remembered.
 */
export async function clearDevice(queue: WriteQueue): Promise<void> {
  await queue.clear()
  queryClient.clear()
  await persister.removeClient()
  await forgetPhotos()
  forgetStorage()
}

/**
 * Someone else signed in where the last person's session ended without
 * signing out here (ACC-003): their notifications stop arriving on this
 * device and what it kept for them goes. Their unsent writes go too: they
 * can't be sent as anyone else.
 */
export async function clearForSomeoneElse(queue: WriteQueue): Promise<void> {
  try {
    if (isAndroidApp()) await (await import('@/native/lifeos')).LifeosNative.resetNotifications()
    const reg = await navigator.serviceWorker?.getRegistration()
    await (await reg?.pushManager?.getSubscription())?.unsubscribe()
  } catch {
    // Clearing goes on regardless.
  }
  await clearDevice(queue)
}

export function session(queue: WriteQueue, signOutOfSupabase = signOutOfSupabaseNow) {
  return {
    unsentWrites: () => queue.entries().length,
    async signOut(): Promise<void> {
      await forgetThisDevice()
      await clearDevice(queue)
      await signOutOfSupabase()
    },
  }
}
