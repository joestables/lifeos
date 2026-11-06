package uk.joestables.lifeos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Alarms don't survive a restart, an update or a change of clock: they are
 * set again from the Reminders kept on the phone, with no signal needed
 * (REM-010 3), then fetched afresh when there is.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderSync.schedule(context)
        SyncWorker.now(context)
    }
}
