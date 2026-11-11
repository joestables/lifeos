package uk.joestables.lifeos

import android.content.Context
import android.content.SharedPreferences

/** What LifeOS's native side keeps on the phone. */
object Prefs {
    /** Where Done and Snooze are sent, and the key the service needs (not a secret). */
    const val ACTION_URL = "action_url"
    const val API_KEY = "api_key"
    /** Which device this phone is, its secret, and where its Alerts come from (ADR-0063). */
    const val DEVICE = "device"
    const val SECRET = "secret"
    const val ALERTS_URL = "alerts_url"
    /** Where they came from before 0.1.13, device-reminders (ADR-0065 4). */
    const val REMINDERS_URL = "reminders_url"
    /** The Reminders last fetched, as JSON, so a reboot can set them again offline. */
    const val FIRINGS = "firings"
    /** The alarms set, by request code, so they can be cancelled. */
    const val SET = "set"
    /** The firings already shown ("reminder|at"), so none is shown twice. */
    const val SHOWN = "shown"

    fun of(context: Context): SharedPreferences =
        context.getSharedPreferences("lifeos", Context.MODE_PRIVATE)

    /** device-alerts' address; a phone set up before 0.1.13 kept device-reminders'. */
    fun alertsUrl(prefs: SharedPreferences): String? =
        prefs.getString(ALERTS_URL, null)
            ?: prefs.getString(REMINDERS_URL, null)?.replace("device-reminders", "device-alerts")
}
