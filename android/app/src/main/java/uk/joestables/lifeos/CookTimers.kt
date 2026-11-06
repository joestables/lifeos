package uk.joestables.lifeos

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * Cooking timers' ends, set on the phone to the second (REM-010 5,
 * ADR-0056, ADR-0063): the page hands over every running timer whenever
 * one starts, pauses, resumes or stops, and each end is an exact alarm
 * shown as a notification, with the page in the background or closed.
 */
object CookTimers {
    private const val KEY = "cook_timers"
    private const val SET = "cook_timers_set"

    /** Replaces the timers set with these: `[{ key, at, title, body, url }]`, `at` in ms. */
    fun set(context: Context, timers: JSONArray) {
        val prefs = Prefs.of(context)
        val alarms = context.getSystemService(AlarmManager::class.java)
        for (code in prefs.getStringSet(SET, emptySet()).orEmpty()) {
            alarms.cancel(pending(context, code.toInt(), null))
        }
        val now = System.currentTimeMillis()
        val set = mutableSetOf<String>()
        for (i in 0 until timers.length()) {
            val timer = timers.optJSONObject(i) ?: continue
            val at = timer.optLong("at")
            if (at <= now) continue
            val code = ("timer:" + timer.optString("key")).hashCode()
            val intent = pending(context, code, timer.toString())
            if (Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExactAlarms()) {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
            } else {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
            }
            set += code.toString()
        }
        prefs.edit().putString(KEY, timers.toString()).putStringSet(SET, set).apply()
    }

    /** Set again after a restart from what the phone kept. */
    fun restore(context: Context) {
        val kept = Prefs.of(context).getString(KEY, null) ?: return
        runCatching { set(context, JSONArray(kept)) }
    }

    fun show(context: Context, timer: JSONObject) {
        Notifications.show(
            context,
            mapOf(
                "kind" to "reminder",
                "title" to timer.optString("title"),
                "body" to timer.optString("body"),
                "url" to timer.optString("url"),
                "tag" to "timer:" + timer.optString("key"),
            ),
        )
    }

    private fun pending(context: Context, code: Int, timer: String?): PendingIntent {
        val intent = Intent(context, TimerReceiver::class.java)
        if (timer != null) intent.putExtra("timer", timer)
        return PendingIntent.getBroadcast(
            context, code, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}

/** A Cooking timer's end (RCP-011 3). */
class TimerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val timer = intent.getStringExtra("timer") ?: return
        CookTimers.show(context, JSONObject(timer))
    }
}
