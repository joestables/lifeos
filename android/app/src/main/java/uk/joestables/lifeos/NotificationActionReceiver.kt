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
        val delivery = intent.getLongExtra("delivery", -1)
        val token = intent.getStringExtra("token") ?: return
        val action = intent.getStringExtra("action") ?: return
        val tag = intent.getStringExtra("tag").orEmpty()
        if (delivery < 0) return
        NotificationManagerCompat.from(context).cancel(Notifications.idOf(tag))
        val work = OneTimeWorkRequestBuilder<ActionWorker>()
            .setInputData(workDataOf("delivery" to delivery, "token" to token, "action" to action))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("action-$delivery-$action", ExistingWorkPolicy.KEEP, work)
    }
}
