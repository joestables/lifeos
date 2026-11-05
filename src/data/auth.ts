import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { deviceOwner, setDeviceOwner } from './device-owner'
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

let clearForSomeoneElse: (() => Promise<void>) | undefined
let clearing = false

/** What is cleared when someone else signs in on this device (ACC-003). */
export function onSomeoneElse(clear: () => Promise<void>): void {
  clearForSomeoneElse = clear
}

/**
 * Signed in. If the device's kept data is someone else's (their session
 * ended without signing out here), it is cleared and the app starts again
 * before anything of theirs shows: until then it stays loading.
 */
function signedIn(session: Session) {
  const me = toMe(session)
  const owner = deviceOwner()
  if (owner && owner !== me.id) {
    if (clearing) return
    clearing = true
    void (clearForSomeoneElse?.() ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => {
        setDeviceOwner(me.id)
        window.location.reload()
      })
    return
  }
  if (clearing) return
  if (!owner) setDeviceOwner(me.id)
  set({ status: 'signed-in', me })
}

function changed(session: Session | null) {
  if (session) signedIn(session)
  else if (!clearing) set({ status: 'signed-out' })
}

function start() {
  if (started) return
  started = true
  const auth = supabase().auth
  void auth.getSession().then(({ data }) => changed(data.session))
  auth.onAuthStateChange((_event, session) => changed(session))
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

/**
 * The Android app's way in (AND-002, ADR-0062): Google's address, for the
 * phone's browser, coming back to the app at `redirectTo` with a code.
 */
export async function googleSignInAddress(redirectTo: string): Promise<string> {
  const { data, error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error || !data.url) throw error ?? new Error('No address for Google')
  return data.url
}

/** Finishes the Android app's sign-in with the code Google sent back (ADR-0062). */
export async function finishSignIn(code: string): Promise<void> {
  const { error } = await supabase().auth.exchangeCodeForSession(code)
  if (error) throw error
}
