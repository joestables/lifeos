import { registerPlugin } from '@capacitor/core'

/** LifeOS's own native plugin (ADR-0061; `LifeosNativePlugin.kt`). */
interface LifeosNative {
  /** Keeps the screen on, or lets it sleep (AND-003 5). */
  keepAwake(options: { on: boolean }): Promise<void>
}

export const LifeosNative = registerPlugin<LifeosNative>('LifeosNative')
