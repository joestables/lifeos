import { useSyncExternalStore } from 'react'

/** Below `md` (768px): the phone layout (docs/30-design/patterns.md#phone). */
const phone = window.matchMedia('(max-width: 767px)')

const subscribe = (onChange: () => void) => {
  phone.addEventListener('change', onChange)
  return () => phone.removeEventListener('change', onChange)
}

/**
 * shadcn's `useIsMobile`, read straight from the media query so the first
 * render is already right.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => phone.matches)
}
