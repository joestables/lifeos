import { createContext, useContext } from 'react'

export const OpenCapture = createContext<() => void>(() => {})

/** Opens capture from anywhere inside CaptureProvider (CAP-002). */
export const useOpenCapture = () => useContext(OpenCapture)
