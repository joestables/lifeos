package uk.joestables.lifeos

import android.view.WindowManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * LifeOS's own native code (ADR-0061), reached from the page through
 * `src/native/lifeos.ts`. Step 5: keeping the screen awake while Cooking
 * (AND-003 5), where the web view has no Screen Wake Lock.
 */
@CapacitorPlugin(name = "LifeosNative")
class LifeosNativePlugin : Plugin() {
    @PluginMethod
    fun keepAwake(call: PluginCall) {
        val on = call.getBoolean("on", true) ?: true
        activity.runOnUiThread {
            if (on) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            call.resolve()
        }
    }
}
