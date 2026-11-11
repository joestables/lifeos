import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'
import { createStore, del, get, set } from 'idb-keyval'

const WEEK = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show what is kept on the device first; refresh when there's a connection.
      networkMode: 'offlineFirst',
      gcTime: WEEK,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

const cache = createStore('lifeos-cache', 'queries')

/** Keeps loaded queries in IndexedDB, so what was opened shows offline (OFF-005). */
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key, cache).then((v) => v ?? null),
    setItem: (key, value) => set(key, value, cache),
    removeItem: (key) => del(key, cache),
  },
})

/**
 * The shape of what is kept: raised whenever a kept query's data changes
 * shape (a field renamed, as `defaultReminderTime` became `defaultAlertTime`
 * in Stage 7b), so a device holding the old shape starts afresh rather than
 * reading it as the new (OFF-005). Raising it costs one refresh.
 */
export const CACHE_SHAPE = '2026-11-11'

export const persistOptions = {
  persister,
  maxAge: WEEK,
  buster: CACHE_SHAPE,
  // Searches are asked afresh (SRC-001); offline, the device's Items are
  // searched (SRC-002). Whether the AI can be used is only true now.
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
      query.queryKey[0] !== 'search' &&
      query.queryKey[0] !== 'ai' &&
      defaultShouldDehydrateQuery(query),
  },
}
