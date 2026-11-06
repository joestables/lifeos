package uk.joestables.lifeos

import android.Manifest
import android.os.Build
import android.view.WindowManager
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.firebase.messaging.FirebaseMessaging

/**
 * LifeOS's own native code (ADR-0061), reached from the page through
 * `src/native/lifeos.ts`: keeping the screen awake while Cooking (AND-003
 * 5), and notifications by FCM (REM-001 4, ADR-0063).
 */
@CapacitorPlugin(
    name = "LifeosNative",
    permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")],
)
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

    /** Whether Android lets LifeOS notify, and the phone's FCM token when it does. */
    @PluginMethod
    fun notificationsState(call: PluginCall) {
        val state = state()
        if (state != "granted") {
            call.resolve(JSObject().put("state", state))
            return
        }
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val result = JSObject().put("state", state)
            if (task.isSuccessful) result.put("token", task.result)
            call.resolve(result)
        }
    }

    /** Asks Android to let LifeOS notify, keeps where presses go, and answers with the token. */
    @PluginMethod
    fun enableNotifications(call: PluginCall) {
        Prefs.of(context).edit()
            .putString(Prefs.ACTION_URL, call.getString("actionUrl"))
            .putString(Prefs.API_KEY, call.getString("apikey"))
            .apply()
        Notifications.ensureChannels(context)
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsAnswered")
            return
        }
        sendToken(call)
    }

    @PermissionCallback
    private fun notificationsAnswered(call: PluginCall) {
        if (state() != "granted") {
            call.reject("denied")
            return
        }
        sendToken(call)
    }

    /** Ends this phone's FCM token (signing out, or someone else signing in: ACC-003). */
    @PluginMethod
    fun resetNotifications(call: PluginCall) {
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener { call.resolve() }
    }

    private fun sendToken(call: PluginCall) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                call.resolve(JSObject().put("token", task.result))
            } else {
                call.reject("Couldn't get a token")
            }
        }
    }

    private fun state(): String = when {
        NotificationManagerCompat.from(context).areNotificationsEnabled() -> "granted"
        Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") == PermissionState.PROMPT -> "prompt"
        Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") == PermissionState.PROMPT_WITH_RATIONALE -> "prompt"
        else -> "denied"
    }
}
