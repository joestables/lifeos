import { createContext, useContext } from 'react'

/** Opens Search: the dialog on a computer, the Search page on a phone (SRC-001 1). */
export const OpenSearch = createContext<() => void>(() => {})
export const useOpenSearch = () => useContext(OpenSearch)
