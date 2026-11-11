package uk.joestables.lifeos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf

/**
 * Done or Snooze pressed on a notification (REM-005): it goes at once, and
 * the press is sent to notification-action when there's signal, as the
 * service worker keeps one made offline (ADR-0044, ADR-0063).
 */
class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra("action") ?: return
        press(
            context,
            delivery = intent.getLongExtra("delivery", -1),
            token = intent.getStringExtra("token").orEmpty(),
            // A notification shown before 0.1.13 names its Alert `reminder`.
            alert = (intent.getStringExtra("alert") ?: intent.getStringExtra("reminder")).orEmpty(),
            action = action,
            tag = intent.getStringExtra("tag").orEmpty(),
            firing = intent.getStringExtra("firing"),
        )
    }

    companion object {
        /** A press, from a notification or the Alarm screen. */
        fun press(
            context: Context,
            delivery: Long,
            token: String,
            alert: String,
            action: String,
            tag: String,
            firing: String?,
        ) {
            if (delivery < 0 && alert.isEmpty()) return
            NotificationManagerCompat.from(context).cancel(Notifications.idOf(tag))
            // An Alert the phone set comes back in an hour even with no signal
            // (REM-005 2); with signal, the server's look again replaces it.
            if (action == "snooze") firing?.let { ReminderSync.snoozeHere(context, it) }
            val work = OneTimeWorkRequestBuilder<ActionWorker>()
                .setInputData(
                    workDataOf("delivery" to delivery, "token" to token, "alert" to alert, "action" to action),
                )
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork("action-$delivery-$alert-$action", ExistingWorkPolicy.KEEP, work)
        }
    }
}
