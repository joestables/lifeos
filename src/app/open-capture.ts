import { createContext, useContext } from 'react'

/** Opens "New" (NEW-001). */
export const OpenCapture = createContext<() => void>(() => {})

/** Opens "New" from anywhere inside CaptureProvider (NEW-001 2). */
export const useOpenCapture = () => useContext(OpenCapture)
