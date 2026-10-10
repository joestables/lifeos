import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/** The signed-in person, as the app shows them. */
export interface Me {
  id: string
  name: string
  email: string
}

type AuthState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; me: Me }

let state: AuthState = { status: 'loading' }
const listeners = new Set<() => void>()
let started = false

function toMe(session: Session): Me {
  const meta = session.user.user_metadata as { full_name?: string; name?: string }
  return {
    id: session.user.id,
    name: meta.full_name ?? meta.name ?? session.user.email ?? '',
    email: session.user.email ?? '',
  }
}

function set(next: AuthState) {
  state = next
  for (const listener of listeners) listener()
}

function start() {
  if (started) return
  started = true
  const auth = supabase().auth
  void auth
    .getSession()
    .then(({ data }) =>
      set(
        data.session ? { status: 'signed-in', me: toMe(data.session) } : { status: 'signed-out' },
      ),
    )
  auth.onAuthStateChange((_event, session) =>
    set(session ? { status: 'signed-in', me: toMe(session) } : { status: 'signed-out' }),
  )
}

const subscribe = (listener: () => void) => {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether someone is signed in, and who (ACC-001). */
export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

/** Resolves once the stored session has been read. */
export function authReady(): Promise<AuthState> {
  start()
  if (state.status !== 'loading') return Promise.resolve(state)
  return new Promise((resolve) => {
    const off = subscribe(() => {
      if (state.status !== 'loading') {
        off()
        resolve(state)
      }
    })
  })
}

/** Google is the only way in: anyone can sign up (ACC-001, ADR-0039). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/inbox` },
  })
  if (error) throw error
}
