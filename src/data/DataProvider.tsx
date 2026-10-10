import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useEffect, type ReactNode } from 'react'
import { queue } from './index'
import { persistOptions, queryClient } from './queryClient'

/** Wraps the app: the query cache kept on the device, and the write queue running. */
export function DataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const flush = () => void queue.flush()
    const onVisible = () => document.visibilityState === 'visible' && flush()
    void queue.load().then(flush)
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  )
}
