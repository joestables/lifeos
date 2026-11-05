import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { deviceOwner } from './device-owner'
import { alreadyApplied, isTransient, WriteError } from './queue/errors'
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
  let result: { error: { code?: string; message: string } | null; status: number }
  try {
    // Only as the person who made it (ACC-003): signed out, or someone else
    // signed in before this device was cleared for them, it waits.
    const { data } = await supabase().auth.getSession()
    const owner = deviceOwner()
    if (!data.session || (owner && data.session.user.id !== owner)) {
      throw new WriteError('Not signed in as whoever made it', false)
    }
    // A Module's function names its schema: "food.create_recipe".
    const [schema, name] = fn.includes('.')
      ? (fn.split('.') as ['food' | 'shopping' | 'fitness', string])
      : [null, fn]
    result = schema
      ? await supabase()
          .schema(schema)
          .rpc(name as never, args as never)
      : await supabase().rpc(fn as never, args as never)
  } catch (cause) {
    if (cause instanceof WriteError) throw cause
    throw new WriteError(String(cause), false)
  }
  if (result.error && alreadyApplied(result.error)) return
  if (result.error) {
    throw new WriteError(result.error.message, !isTransient(result.status))
  }
}
