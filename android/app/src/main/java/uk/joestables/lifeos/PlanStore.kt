package uk.joestables.lifeos

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * What the Today widget shows (WID-002, ADR-0064): today's and tomorrow's
 * cards, kept on the phone so it shows with no signal and turns to the new
 * day at midnight with nothing to fetch. Written by the app when they change
 * on the phone (`setPlan`), and fetched from device-plan when the server
 * says to look again, when the app opens, and every half hour.
 */
object PlanStore {
    private const val KEY = "plan"
    private const val CHOICES = "plan_choices"

    /**
     * The widget's own state (Glance's, read inside its composition, so a
     * running widget redraws when it changes): whether the Add list shows,
     * and a stamp bumped whenever what it shows changed on the phone.
     */
    val ADDING = booleanPreferencesKey("adding")
    val STAMP = longPreferencesKey("stamp")

    /** The phone's day, as Plan's days are named: "2026-11-06". */
    fun dayOf(at: Long = System.currentTimeMillis()): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.UK).format(Date(at))

    /** A day's cards, or null when the phone holds none for it (signed out, not yet fetched). */
    fun cards(context: Context, day: String = dayOf()): JSONArray? {
        val days = runCatching { JSONArray(Prefs.of(context).getString(KEY, null) ?: return null) }.getOrNull()
            ?: return null
        for (i in 0 until days.length()) {
            val d = days.optJSONObject(i) ?: continue
            if (d.optString("day") == day) return d.optJSONArray("cards") ?: JSONArray()
        }
        return null
    }

    /** Whether the phone is signed in as a device, to show its Plan at all. */
    fun signedIn(context: Context): Boolean = Prefs.of(context).getString(Prefs.SECRET, null) != null

    /** Keeps the days, and the Add list's Types when the app gives them, and redraws the widget. */
    fun save(context: Context, days: JSONArray, choices: JSONArray? = null) {
        val edit = Prefs.of(context).edit().putString(KEY, days.toString())
        if (choices != null) edit.putString(CHOICES, choices.toString())
        edit.apply()
        redraw(context)
    }

    /** The Types the widget's Add list offers, as Plan's "+" does (WID-002 8): `[{ key, label, colour }]`. */
    fun choices(context: Context): JSONArray? =
        runCatching { JSONArray(Prefs.of(context).getString(CHOICES, null) ?: return null) }.getOrNull()
            ?.takeIf { it.length() > 0 }

    /** Closes the widget's Add list (a Type chosen from it opened the app). */
    fun closeAdding(context: Context) {
        val app = context.applicationContext
        Thread { runBlocking { each(app) { it[ADDING] = false } } }.start()
    }

    /** Changes every Today widget's state and redraws it. */
    private suspend fun each(context: Context, change: (MutablePreferences) -> Unit) {
        val widget = TodayWidget()
        for (id in GlanceAppWidgetManager(context).getGlanceIds(TodayWidget::class.java)) {
            updateAppWidgetState(context, id) { change(it) }
            widget.update(context, id)
        }
    }

    fun clear(context: Context) {
        Prefs.of(context).edit().remove(KEY).apply()
        redraw(context)
    }

    /** Fetches the two days from device-plan; throws when there's no signal, so the work is tried again. */
    fun fetch(context: Context) {
        val prefs = Prefs.of(context)
        val url = prefs.getString(Prefs.REMINDERS_URL, null)?.replace("device-reminders", "device-plan") ?: return
        val device = prefs.getString(Prefs.DEVICE, null) ?: return
        val secret = prefs.getString(Prefs.SECRET, null) ?: return
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("apikey", prefs.getString(Prefs.API_KEY, "") ?: "")
        connection.doOutput = true
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        connection.outputStream.use {
            it.write(JSONObject().put("device", device).put("secret", secret).toString().toByteArray())
        }
        val status = connection.responseCode
        if (status == 403) {
            connection.disconnect()
            clear(context)
            return
        }
        if (status !in 200..299) {
            connection.disconnect()
            throw java.io.IOException("device-plan: $status")
        }
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()
        save(context, JSONObject(body).optJSONArray("days") ?: JSONArray())
    }

    /** Redraws every Today widget, off the main thread, and sets the turn at midnight. */
    fun redraw(context: Context) {
        val app = context.applicationContext
        Thread {
            runBlocking {
                each(app) {
                    it[STAMP] = System.currentTimeMillis()
                    // Signed out, no Add list waits for signing in again.
                    if (!signedIn(app)) it[ADDING] = false
                }
            }
        }.start()
        atMidnight(app)
    }

    /** Wakes the widget just after midnight to show the new day (WID-002 5). */
    private fun atMidnight(context: Context) {
        val next = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 5)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        val intent = PendingIntent.getBroadcast(
            context, 0x504C, Intent(context, MidnightReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        context.getSystemService(AlarmManager::class.java)
            .setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, intent)
    }
}

/** Midnight: the widget turns to the new day, and fetches it afresh when there's signal. */
class MidnightReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        PlanStore.redraw(context)
        SyncWorker.now(context)
    }
}
