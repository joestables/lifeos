package uk.joestables.lifeos

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Fetches and sets the phone's Reminders when there's signal (REM-010 2):
 * when FCM says to look again, when the app opens, and once a day so the
 * week ahead rolls on.
 */
class SyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = try {
        ReminderSync.fetch(applicationContext)
        Result.success()
    } catch (_: IOException) {
        Result.retry()
    }

    companion object {
        private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun now(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                "reminders-now",
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(online).build(),
            )
        }

        fun daily(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "reminders-daily",
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.DAYS).setConstraints(online).build(),
            )
        }

        fun stop(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("reminders-daily")
        }
    }
}
