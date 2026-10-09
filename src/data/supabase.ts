import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { isTransient, WriteError } from './queue/errors'
import type { Transport } from './queue/queue'

export type LifeosClient = SupabaseClient<Database, 'core'>

let client: LifeosClient | undefined

/** The one Supabase client. Only src/data/ may use it (ADR-0042). */
export function supabase(): LifeosClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      throw new Error(
        'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set (.env.example)',
      )
    }
    client = createClient<Database, 'core'>(url, key, { db: { schema: 'core' } })
  }
  return client
}

/** Sends one queued call as an RPC, sorting failures into retry or refuse. */
export const rpcTransport: Transport = async (fn, args) => {
  let result: { error: { message: string } | null; status: number }
  try {
    result = await supabase().rpc(fn, args as never)
  } catch (cause) {
    throw new WriteError(String(cause), false)
  }
  if (result.error) {
    throw new WriteError(result.error.message, !isTransient(result.status))
  }
}
