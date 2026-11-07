package uk.joestables.lifeos

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.provider.Settings
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
 * 5), notifications by FCM (REM-001 4), Reminders, Alarms and Cooking
 * timers set on the phone (REM-010, REM-011, ADR-0063).
 */
@CapacitorPlugin(
    name = "LifeosNative",
    permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")],
)
class LifeosNativePlugin : Plugin() {
    /** A share waiting for the page to take it (AND-004): `/share?title=…&text=…`. */
    private var share: String? = null

    override fun load() {
        share = shareOf(activity.intent)
        closeAdding(activity.intent)
    }

    /** A Type chosen from the widget's Add list opened the app: the widget shows its day again. */
    private fun closeAdding(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.path == "/plan" && data.getQueryParameter("add") != null) PlanStore.closeAdding(context)
    }

    /** Shared to LifeOS while it was open: the page is told to take it. */
    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        closeAdding(intent)
        shareOf(intent)?.let {
            share = it
            notifyListeners("share", JSObject(), true)
        }
    }

    /** The share waiting, once: where the page goes to keep it (ADR-0055). */
    @PluginMethod
    fun takeShare(call: PluginCall) {
        val path = share
        share = null
        call.resolve(JSObject().apply { if (path != null) put("path", path) })
    }

    /**
     * Today's and tomorrow's cards for the Today widget, as Plan works them
     * out on the phone (WID-002 5): `{ days: [{ day, cards }] }`.
     */
    @PluginMethod
    fun setPlan(call: PluginCall) {
        PlanStore.save(context, call.getArray("days") ?: com.getcapacitor.JSArray(), call.getArray("choices"))
        call.resolve()
    }

    /** Back to the app shared from, LifeOS left as it was (RCP-003 2). */
    @PluginMethod
    fun leave(call: PluginCall) {
        activity.runOnUiThread {
            activity.moveTaskToBack(true)
            call.resolve()
        }
    }

    /** What Android's share sheet sent, as the web's share target sends it. */
    private fun shareOf(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND) return null
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)
        val title = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: intent.getStringExtra(Intent.EXTRA_TITLE)
        if (text == null && title == null) return null
        // Taken once: a later reopening of the app isn't the same share again.
        intent.action = Intent.ACTION_MAIN
        val query = Uri.Builder()
        title?.let { query.appendQueryParameter("title", it) }
        text?.let { query.appendQueryParameter("text", it) }
        return "/share" + query.build().toString()
    }

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

    /** Which device this phone is and its secret; its Reminders set from now on (REM-010). */
    @PluginMethod
    fun setDevice(call: PluginCall) {
        val device = call.getString("device")
        val secret = call.getString("secret")
        val url = call.getString("remindersUrl")
        if (device == null || secret == null || url == null) {
            call.reject("device, secret and remindersUrl are needed")
            return
        }
        Prefs.of(context).edit()
            .putString(Prefs.DEVICE, device)
            .putString(Prefs.SECRET, secret)
            .putString(Prefs.REMINDERS_URL, url)
            .apply()
        SyncWorker.now(context)
        SyncWorker.daily(context)
        call.resolve()
    }

    @PluginMethod
    fun deviceState(call: PluginCall) {
        val prefs = Prefs.of(context)
        call.resolve(
            JSObject().put(
                "hasDevice",
                prefs.getString(Prefs.DEVICE, null) != null && prefs.getString(Prefs.SECRET, null) != null,
            ),
        )
    }

    @PluginMethod
    fun syncReminders(call: PluginCall) {
        SyncWorker.now(context)
        call.resolve()
    }

    /**
     * Ends this phone's FCM token and forgets its device and Reminders
     * (signing out, or someone else signing in: ACC-003).
     */
    @PluginMethod
    fun resetNotifications(call: PluginCall) {
        SyncWorker.stop(context)
        ReminderSync.forget(context)
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener { call.resolve() }
    }

    /**
     * Whether Android lets an Alarm show full screen over the lock screen:
     * from Android 14 only alarm and calling apps installed from Play are
     * allowed without asking (ADR-0063).
     */
    @PluginMethod
    fun alarmsState(call: PluginCall) {
        val allowed = Build.VERSION.SDK_INT < 34 ||
            context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
        call.resolve(JSObject().put("fullScreen", allowed))
    }

    /** Opens Android's setting for full-screen alarms. */
    @PluginMethod
    fun allowFullScreen(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 34) {
            activity.startActivity(
                Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + context.packageName)),
            )
        }
        call.resolve()
    }

    /** Sets the running Cooking timers' ends on the phone (REM-010 5): `{ timers: [...] }`. */
    @PluginMethod
    fun setTimers(call: PluginCall) {
        CookTimers.set(context, call.getArray("timers") ?: com.getcapacitor.JSArray())
        call.resolve()
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
