package uk.joestables.lifeos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** A Reminder the phone set comes due: shown at its minute (REM-010 1). */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val firing = intent.getStringExtra("firing") ?: return
        val key = intent.getStringExtra("key") ?: return
        ReminderSync.fire(context, firing, key)
    }
}
