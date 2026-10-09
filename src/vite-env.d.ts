/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

/** Whether this build includes the /design page (vite.config.ts). */
declare const __DESIGN_PAGE__: boolean
