import { createContext } from 'react'
import type { CaptureLook } from './CaptureButton'

/** Opens capture, from the AppShell to each page's PageHeader (components.md#pageheader). */
export const ShellCapture = createContext<(() => void) | undefined>(undefined)

/** How "New" looks: 'ghost', or one of Stage 7b's draft directions. */
export const ShellCaptureLook = createContext<CaptureLook>('ghost')
