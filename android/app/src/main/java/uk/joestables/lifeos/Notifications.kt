package uk.joestables.lifeos

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray

/**
 * LifeOS's notifications on Android (ADR-0063, patterns.md#the-android-app):
 * Android's own, with LifeOS's words, in four groups, the small icon tinted
 * with the Item's Type colour, Done and Snooze where the Item has them, and
 * a tap opening the Item in the app.
 */
object Notifications {
    const val REMINDERS = "reminders"
    const val DIGEST = "digest"
    const val OVERDUE = "overdue"
    const val ALARMS = "alarms"

    /** The groups in Android's settings: Reminders, Alarms, Morning digest, Overdue. */
    fun ensureChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannels(
            listOf(
                NotificationChannel(REMINDERS, "Reminders", NotificationManager.IMPORTANCE_HIGH),
                NotificationChannel(ALARMS, "Alarms", NotificationManager.IMPORTANCE_HIGH),
                NotificationChannel(DIGEST, "Morning digest", NotificationManager.IMPORTANCE_DEFAULT),
                NotificationChannel(OVERDUE, "Overdue", NotificationManager.IMPORTANCE_HIGH),
            ),
        )
    }

    /** The notification's id: its tag's, so a repeat replaces it (REM-004 2). */
    fun idOf(tag: String): Int = tag.hashCode()

    /** Shows what an FCM data message says (send-notifications' `fcmMessage`). */
    fun show(context: Context, data: Map<String, String>) {
        ensureChannels(context)
        val tag = data["tag"].orEmpty()
        val id = idOf(tag)
        val channel = when (data["kind"]) {
            "digest" -> DIGEST
            "overdue" -> OVERDUE
            else -> REMINDERS
        }
        val open = Intent(Intent.ACTION_VIEW, Uri.parse("https://joestables.uk" + data["url"].orEmpty()))
            .setPackage(context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val builder = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_lifeos)
            .setContentTitle(data["title"].orEmpty())
            .setContentText(data["body"].orEmpty().ifEmpty { null })
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(
                PendingIntent.getActivity(
                    context, id, open,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                ),
            )
        colourOf(data["colour"])?.let { builder.setColor(ContextCompat.getColor(context, it)) }

        val delivery = data["delivery"]?.toLongOrNull()
        val token = data["token"].orEmpty()
        if (delivery != null && token.isNotEmpty()) {
            val actions = runCatching { JSONArray(data["actions"] ?: "[]") }.getOrDefault(JSONArray())
            for (i in 0 until actions.length()) {
                val action = actions.getJSONObject(i)
                val name = action.optString("action")
                val press = Intent(context, NotificationActionReceiver::class.java)
                    .putExtra("delivery", delivery)
                    .putExtra("token", token)
                    .putExtra("action", name)
                    .putExtra("tag", tag)
                builder.addAction(
                    0,
                    action.optString("title"),
                    PendingIntent.getBroadcast(
                        context, (tag + name).hashCode(), press,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                    ),
                )
            }
        }
        val manager = NotificationManagerCompat.from(context)
        if (manager.areNotificationsEnabled()) {
            try {
                manager.notify(id, builder.build())
            } catch (_: SecurityException) {
                // Notifications were turned off in Android's settings meanwhile.
            }
        }
    }

    /** A Type colour's resource (tokens.md's --t-*, as colors.xml holds them). */
    private fun colourOf(colour: String?): Int? = when (colour) {
        "blue" -> R.color.lifeos_t_blue
        "yellow" -> R.color.lifeos_t_yellow
        "coral" -> R.color.lifeos_t_coral
        "green" -> R.color.lifeos_t_green
        "orange" -> R.color.lifeos_t_orange
        "purple" -> R.color.lifeos_t_purple
        else -> null
    }
}
