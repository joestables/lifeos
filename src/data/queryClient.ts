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

export const persistOptions = {
  persister,
  maxAge: WEEK,
  // Searches are asked afresh (SRC-001); offline, the device's Items are searched (SRC-002).
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
      query.queryKey[0] !== 'search' && defaultShouldDehydrateQuery(query),
  },
}
