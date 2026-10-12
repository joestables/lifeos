import { createContext, useContext } from 'react'

/** Opens capture; as a Task for "New task" (TSK-001). */
export const OpenCapture = createContext<(type?: 'thought' | 'task') => void>(() => {})

/** Opens capture from anywhere inside CaptureProvider (CAP-002). */
export const useOpenCapture = () => useContext(OpenCapture)
