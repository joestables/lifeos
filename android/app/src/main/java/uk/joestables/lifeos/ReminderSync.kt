package uk.joestables.lifeos

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.TimeZone

/**
 * The Reminders the phone sets itself (REM-010, ADR-0063): fetched for the
 * week ahead from device-reminders, kept on the phone, and each set as an
 * exact alarm, so it arrives at its minute with the phone idle or offline.
 * One up to 12 hours late (the phone was off) is shown at once; none twice.
 */
object ReminderSync {
    private const val LATE_MS = 12 * 60 * 60 * 1000L
    private const val ALARM_LATE_MS = 10 * 60 * 1000L

    /** Fetches the week's Reminders; throws when there's no signal, so the work is tried again. */
    fun fetch(context: Context) {
        val prefs = Prefs.of(context)
        val url = prefs.getString(Prefs.REMINDERS_URL, null) ?: return
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
            // This phone is no longer a device (removed in Settings): nothing to set.
            connection.disconnect()
            prefs.edit().putString(Prefs.FIRINGS, "[]").apply()
            schedule(context)
            return
        }
        if (status !in 200..299) {
            connection.disconnect()
            throw java.io.IOException("device-reminders: $status")
        }
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()
        val firings = JSONObject(body).optJSONArray("firings") ?: JSONArray()
        prefs.edit().putString(Prefs.FIRINGS, firings.toString()).apply()
        schedule(context)
    }

    /** Sets an alarm for each Reminder kept, replacing those set before. */
    fun schedule(context: Context) {
        val prefs = Prefs.of(context)
        val alarms = context.getSystemService(AlarmManager::class.java)
        for (code in prefs.getStringSet(Prefs.SET, emptySet()).orEmpty()) {
            alarms.cancel(pending(context, code.toInt(), null))
            alarms.cancel(screen(context, code.toInt(), null, null))
        }
        val firings = runCatching { JSONArray(prefs.getString(Prefs.FIRINGS, "[]")) }.getOrDefault(JSONArray())
        val now = System.currentTimeMillis()
        val shown = prefs.getStringSet(Prefs.SHOWN, emptySet()).orEmpty()
        val set = mutableSetOf<String>()
        for (i in 0 until firings.length()) {
            val firing = firings.getJSONObject(i)
            val at = epochMillis(firing.getString("at")) ?: continue
            val key = firing.getString("reminder") + "|" + at
            if (key in shown) continue
            if (at <= now) {
                if (now - at <= LATE_MS) fire(context, firing.toString(), key)
                continue
            }
            val code = key.hashCode()
            set(context, alarms, at, code, firing.toString(), key)
            set += code.toString()
        }
        prefs.edit().putStringSet(Prefs.SET, set).apply()
    }

    /** Sets one firing an hour from now: Snooze pressed with no signal (REM-005 2). */
    fun snoozeHere(context: Context, firing: String) {
        val reminder = runCatching { JSONObject(firing).getString("reminder") }.getOrNull() ?: return
        val at = System.currentTimeMillis() + 60 * 60 * 1000L
        val key = "$reminder|$at"
        set(context, context.getSystemService(AlarmManager::class.java), at, key.hashCode(), firing, key)
    }

    /**
     * Sets one firing. An Alarm is set as the clock's are: shown in the
     * status bar and on the lock screen as the next alarm, never held back,
     * and opening the Alarm screen itself when it comes due, over whatever
     * is on screen, as the clock's alarm screen does (REM-011 2).
     */
    private fun set(context: Context, alarms: AlarmManager, at: Long, code: Int, firing: String, key: String) {
        val alarm = runCatching { JSONObject(firing).optJSONObject("payload")?.optBoolean("alarm") }
            .getOrNull() == true
        val exact = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()
        when {
            alarm && exact ->
                alarms.setAlarmClock(AlarmManager.AlarmClockInfo(at, openApp(context)), screen(context, code, firing, key))
            !exact -> alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context, code, firing, key))
            else -> alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context, code, firing, key))
        }
    }

    /** The Alarm screen, opened by the alarm itself. */
    private fun screen(context: Context, code: Int, firing: String?, key: String?): PendingIntent {
        val intent = Intent(context, AlarmActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        if (firing != null) intent.putExtra("firing", firing).putExtra("key", key)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        if (Build.VERSION.SDK_INT >= 35) {
            // Android 15 asks the app to say an activity it hands over may be opened.
            val options = android.app.ActivityOptions.makeBasic()
                .setPendingIntentCreatorBackgroundActivityStartMode(
                    android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED,
                )
            return PendingIntent.getActivity(context, code, intent, flags, options.toBundle())
        }
        return PendingIntent.getActivity(context, code, intent, flags)
    }

    /**
     * Shows a firing now, once: an Alarm rings (REM-011 2), unless it is
     * more than ten minutes late (the phone was off), when it is shown as a
     * notification as any other.
     */
    fun fire(context: Context, firing: String, key: String): Boolean {
        val prefs = Prefs.of(context)
        val day = 2 * 24 * 60 * 60 * 1000L
        val now = System.currentTimeMillis()
        // What was shown is kept two days, so a list fetched again doesn't show it twice.
        val shown = prefs.getStringSet(Prefs.SHOWN, emptySet()).orEmpty()
            .filter { (it.substringAfter('|').toLongOrNull() ?: 0) > now - day }
            .toMutableSet()
        if (key in shown) return false
        shown += key
        prefs.edit().putStringSet(Prefs.SHOWN, shown).apply()
        val json = JSONObject(firing)
        val payload = json.optJSONObject("payload") ?: return false
        val at = key.substringAfter('|').toLongOrNull() ?: now
        if (payload.optBoolean("alarm") && now - at <= ALARM_LATE_MS) {
            AlarmService.ring(context, firing)
            return true
        }
        Notifications.show(context, dataOf(json, payload))
        return false
    }

    /** A firing as Notifications.show takes it, with what Done and Snooze need. */
    fun dataOf(json: JSONObject, payload: JSONObject): Map<String, String> {
        val data = mutableMapOf<String, String>()
        for (name in payload.keys()) {
            data[name] = if (name == "actions") payload.optJSONArray(name)?.toString() ?: "[]" else payload.optString(name)
        }
        data["kind"] = "reminder"
        data["reminder"] = json.getString("reminder")
        data["firing"] = json.toString()
        return data
    }

    private val TIMESTAMP =
        Regex("""^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d):(\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d(?::?\d\d)?)$""")

    /**
     * A Postgres timestamp as the server sends it ("2026-11-07T09:00:00+00:00",
     * sometimes with microseconds), as milliseconds; java.time needs Android 8.
     */
    fun epochMillis(text: String): Long? {
        val m = TIMESTAMP.matchEntire(text.trim()) ?: return null
        val (y, mo, d, h, mi, se) = m.destructured
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
        calendar.clear()
        calendar.set(y.toInt(), mo.toInt() - 1, d.toInt(), h.toInt(), mi.toInt(), se.toInt())
        val millis = m.groupValues[7].padEnd(3, '0').take(3).ifEmpty { "0" }.toInt()
        val zone = m.groupValues[8]
        val offset = if (zone == "Z") {
            0
        } else {
            val sign = if (zone[0] == '-') -1 else 1
            val digits = zone.substring(1).replace(":", "")
            sign * (digits.substring(0, 2).toInt() * 60 + (digits.drop(2).toIntOrNull() ?: 0)) * 60_000
        }
        return calendar.timeInMillis + millis - offset
    }

    /** Forgets the device and cancels its alarms (signing out: ACC-003). */
    fun forget(context: Context) {
        val prefs = Prefs.of(context)
        prefs.edit().putString(Prefs.FIRINGS, "[]").remove(Prefs.DEVICE).remove(Prefs.SECRET).apply()
        schedule(context)
    }

    private fun openApp(context: Context): PendingIntent = PendingIntent.getActivity(
        context, 0,
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun pending(context: Context, code: Int, firing: String?, key: String? = null): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java)
        if (firing != null) intent.putExtra("firing", firing).putExtra("key", key)
        return PendingIntent.getBroadcast(
            context, code, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
