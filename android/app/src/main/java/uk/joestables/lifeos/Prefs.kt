package uk.joestables.lifeos

import android.content.Context
import android.content.SharedPreferences

/** What LifeOS's native side keeps on the phone. */
object Prefs {
    /** Where Done and Snooze are sent, and the key the service needs (not a secret). */
    const val ACTION_URL = "action_url"
    const val API_KEY = "api_key"

    fun of(context: Context): SharedPreferences =
        context.getSharedPreferences("lifeos", Context.MODE_PRIVATE)
}
