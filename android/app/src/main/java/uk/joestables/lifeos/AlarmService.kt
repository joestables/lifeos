package uk.joestables.lifeos

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * An Alarm ringing (REM-011, ADR-0063): the alarm sound on the alarm stream,
 * so silent and Do Not Disturb don't stop it, and vibration, until Stop,
 * Snooze or Done; shown full screen over the lock screen (AlarmActivity),
 * or as a heads-up notification with the same buttons while the phone is
 * in use. As the clock's alarms do, it falls quiet after ten minutes and
 * stays as an ordinary notification.
 */
class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var firing: String? = null
    private val handler = Handler(Looper.getMainLooper())
    private val quiet = Runnable { firing?.let { leaveAsNotification(it) }; finish() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            RING -> {
                val next = intent.getStringExtra("firing") ?: return START_NOT_STICKY
                // A second Alarm while one rings: the first stays as a notification.
                firing?.let { if (it != next) leaveAsNotification(it) }
                firing = next
                start(next)
            }
            STOP, SNOOZE, DONE -> {
                val current = firing
                if (current != null && intent.action != STOP) {
                    val json = JSONObject(current)
                    val payload = json.optJSONObject("payload") ?: JSONObject()
                    NotificationActionReceiver.press(
                        this,
                        delivery = -1,
                        token = "",
                        reminder = json.optString("reminder"),
                        action = if (intent.action == DONE) "done" else "snooze",
                        tag = payload.optString("tag"),
                        firing = current,
                    )
                }
                finish()
            }
            else -> if (firing == null) stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun start(firing: String) {
        Notifications.ensureChannels(this)
        val notification = notification(firing)
        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, notification,
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED else 0,
        )
        ring()
        handler.removeCallbacks(quiet)
        handler.postDelayed(quiet, QUIET_AFTER_MS)
    }

    private fun ring() {
        player?.release()
        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        player = runCatching {
            MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                setDataSource(this@AlarmService, uri)
                isLooping = true
                setWakeMode(this@AlarmService, PowerManager.PARTIAL_WAKE_LOCK)
                prepare()
                start()
            }
        }.getOrNull()
        vibrator = if (Build.VERSION.SDK_INT >= 31) {
            getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Vibrator::class.java)
        }
        val pattern = longArrayOf(0, 600, 400)
        if (Build.VERSION.SDK_INT >= 26) {
            val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
            @Suppress("DEPRECATION")
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0), attributes)
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun notification(firing: String): Notification {
        val json = JSONObject(firing)
        val payload = json.optJSONObject("payload") ?: JSONObject()
        val screen = Intent(this, AlarmActivity::class.java)
            .putExtra("firing", firing)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        val full = PendingIntent.getActivity(
            this, 0, screen, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, Notifications.ALARMS)
            .setSmallIcon(R.drawable.ic_stat_lifeos)
            .setContentTitle(payload.optString("title"))
            .setContentText(payload.optString("body").ifEmpty { null })
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setSilent(true)
            .setFullScreenIntent(full, true)
            .setContentIntent(full)
            .addAction(0, "Stop", action(STOP))
            .addAction(0, "Snooze 1 hour", action(SNOOZE))
        if (completable(payload)) builder.addAction(0, "Done", action(DONE))
        Notifications.colourOf(payload.optString("colour"))?.let {
            builder.setColor(ContextCompat.getColor(this, it))
        }
        return builder.build()
    }

    private fun action(name: String): PendingIntent = PendingIntent.getService(
        this, name.hashCode(), Intent(this, AlarmService::class.java).setAction(name),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    /** Rung out or replaced: kept as an ordinary notification, with its buttons. */
    private fun leaveAsNotification(firing: String) {
        val json = JSONObject(firing)
        val payload = json.optJSONObject("payload") ?: return
        Notifications.show(this, ReminderSync.dataOf(json, payload))
    }

    private fun finish() {
        handler.removeCallbacks(quiet)
        player?.run { runCatching { stop() }; release() }
        player = null
        vibrator?.cancel()
        firing = null
        screen?.get()?.finish()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacks(quiet)
        player?.release()
        vibrator?.cancel()
        super.onDestroy()
    }

    companion object {
        const val RING = "uk.joestables.lifeos.alarm.RING"
        const val STOP = "uk.joestables.lifeos.alarm.STOP"
        const val SNOOZE = "uk.joestables.lifeos.alarm.SNOOZE"
        const val DONE = "uk.joestables.lifeos.alarm.DONE"
        private const val NOTIFICATION_ID = 0x4C41
        private const val QUIET_AFTER_MS = 10 * 60 * 1000L

        /** The Alarm screen showing, closed when the Alarm stops from its notification. */
        var screen: WeakReference<AlarmActivity>? = null

        fun ring(context: Context, firing: String) {
            try {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, AlarmService::class.java).setAction(RING).putExtra("firing", firing),
                )
            } catch (_: IllegalStateException) {
                // Android wouldn't let it ring from here: at least it shows.
                val json = JSONObject(firing)
                json.optJSONObject("payload")?.let { Notifications.show(context, ReminderSync.dataOf(json, it)) }
            }
        }

        fun press(context: Context, action: String) {
            context.startService(Intent(context, AlarmService::class.java).setAction(action))
        }

        /** Whether the Item can be Done: its notification offers it (REM-011 2). */
        fun completable(payload: JSONObject): Boolean {
            val actions = payload.optJSONArray("actions") ?: return false
            return (0 until actions.length()).any { actions.optJSONObject(it)?.optString("action") == "done" }
        }
    }
}
