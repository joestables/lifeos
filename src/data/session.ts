import { persister, queryClient } from './queryClient'
import type { WriteQueue } from './queue/queue'
import { supabase } from './supabase'

/**
 * Signing out (ACC-003). The caller first asks how many writes haven't been
 * sent and warns before going on; then the queue and every cached Item are
 * removed from the device.
 */
export function session(queue: WriteQueue, signOutOfSupabase = () => supabase().auth.signOut()) {
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
