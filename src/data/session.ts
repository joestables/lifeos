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

export function session(queue: WriteQueue, signOutOfSupabase = signOutOfSupabaseNow) {
  return {
    unsentWrites: () => queue.entries().length,
    async signOut(): Promise<void> {
      await queue.clear()
      queryClient.clear()
      await persister.removeClient()
      await signOutOfSupabase()
    },
  }
}
