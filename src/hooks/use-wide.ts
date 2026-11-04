import { useSyncExternalStore } from 'react'

/** `lg` (1024px) and up: a list and what is chosen from it side by side (ListDetail). */
const wide = window.matchMedia('(min-width: 1024px)')

const subscribe = (onChange: () => void) => {
  wide.addEventListener('change', onChange)
  return () => wide.removeEventListener('change', onChange)
}

export function useIsWide() {
  return useSyncExternalStore(subscribe, () => wide.matches)
}
