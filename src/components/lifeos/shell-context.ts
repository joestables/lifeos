import { createContext } from 'react'

/** Opens capture, from the AppShell to each page's PageHeader (components.md#pageheader). */
export const ShellCapture = createContext<(() => void) | undefined>(undefined)
