package uk.joestables.lifeos

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sends a Done or Snooze press to notification-action, proved by the
 * delivery's token (ADR-0044); tried again until there's signal.
 */
class ActionWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val prefs = Prefs.of(applicationContext)
        val url = prefs.getString(Prefs.ACTION_URL, null) ?: return Result.failure()
        val apikey = prefs.getString(Prefs.API_KEY, null) ?: return Result.failure()
        val reminder = inputData.getString("reminder").orEmpty()
        val body = if (reminder.isNotEmpty()) {
            // A Reminder the phone set: proved by the device's secret (ADR-0063).
            JSONObject()
                .put("device", prefs.getString(Prefs.DEVICE, null) ?: return Result.failure())
                .put("secret", prefs.getString(Prefs.SECRET, null) ?: return Result.failure())
                .put("reminder", reminder)
                .put("action", inputData.getString("action"))
                .toString()
        } else {
            JSONObject()
                .put("delivery", inputData.getLong("delivery", -1))
                .put("token", inputData.getString("token"))
                .put("action", inputData.getString("action"))
                .toString()
        }
        return try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", apikey)
            connection.doOutput = true
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.outputStream.use { it.write(body.toByteArray()) }
            val status = connection.responseCode
            connection.disconnect()
            // Refused (an old notification, a Task already deleted): nothing to retry.
            if (status in 200..499) Result.success() else Result.retry()
        } catch (_: IOException) {
            Result.retry()
        }
    }
}
