package uk.joestables.lifeos

import android.content.Intent
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The AlarmScreen (components.md, REM-011 2), drawn natively from its spec
 * over the lock screen: the Item's TypeTile, the time, the date and the
 * title a third of the way down; Stop, Snooze 1 hour, and Done for a
 * Completable Item at the foot, in LifeOS's font. Back does nothing: an Alarm is stopped,
 * snoozed or done.
 */
class AlarmActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AlarmService.screen = WeakReference(this)
        overLockScreen()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = Unit
        })
        toRing = savedInstanceState == null && intent.getStringExtra("key") != null
        show(intent)
    }

    /** Opened by the alarm itself (ReminderSync), it rings from here once it shows. */
    private var toRing = false

    override fun onResume() {
        super.onResume()
        if (!toRing) return
        toRing = false
        val firing = intent.getStringExtra("firing") ?: return
        val key = intent.getStringExtra("key") ?: return
        // One already rung, or too late to ring, is a notification instead.
        if (!ReminderSync.fire(this, firing, key)) finish()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Another Alarm while this one shows: it rings in this one's place.
        if (intent.getStringExtra("key") != null) toRing = true
        show(intent)
    }

    override fun onDestroy() {
        if (AlarmService.screen?.get() === this) AlarmService.screen = null
        super.onDestroy()
    }

    private fun overLockScreen() {
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun show(intent: Intent) {
        val firing = intent.getStringExtra("firing") ?: return finish()
        val json = JSONObject(firing)
        val payload = json.optJSONObject("payload") ?: JSONObject()
        val at = ReminderSync.epochMillis(json.optString("at")) ?: System.currentTimeMillis()
        setContentView(screen(payload, at, payload.optString("colour")))
    }

    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)
    private fun px(v: Float) = dp(v).toInt()
    private fun colour(id: Int) = ContextCompat.getColor(this, id)

    /** The Type colour's three values (colors.xml): its colour, as text, and text on it. */
    private fun typeColours(name: String?): Triple<Int, Int, Int>? = when (name) {
        "blue" -> Triple(R.color.lifeos_t_blue, R.color.lifeos_t_blue_text, R.color.lifeos_t_blue_foreground)
        "yellow" -> Triple(R.color.lifeos_t_yellow, R.color.lifeos_t_yellow_text, R.color.lifeos_t_yellow_foreground)
        "coral" -> Triple(R.color.lifeos_t_coral, R.color.lifeos_t_coral_text, R.color.lifeos_t_coral_foreground)
        "green" -> Triple(R.color.lifeos_t_green, R.color.lifeos_t_green_text, R.color.lifeos_t_green_foreground)
        "orange" -> Triple(R.color.lifeos_t_orange, R.color.lifeos_t_orange_text, R.color.lifeos_t_orange_foreground)
        "purple" -> Triple(R.color.lifeos_t_purple, R.color.lifeos_t_purple_text, R.color.lifeos_t_purple_foreground)
        else -> null
    }

    private fun screen(payload: JSONObject, at: Long, colourName: String?): View {
        // The Item's TypeScope; with no Type colour, the neutral ink.
        val type = typeColours(colourName)
        val tc = colour(type?.first ?: R.color.lifeos_foreground)
        val tcText = colour(type?.second ?: R.color.lifeos_muted_foreground)
        val tcForeground = colour(type?.third ?: R.color.lifeos_background)

        val root = FrameLayout(this).apply { setBackgroundColor(colour(R.color.lifeos_background)) }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(px(20f), 0, px(20f), 0)
        }
        root.addView(column, FrameLayout.LayoutParams(-1, -1))

        // Centred, a third of the way down: tile, time, date, title.
        val top = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
        }
        column.addView(top, LinearLayout.LayoutParams(-1, 0, 1f))

        val tile = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                cornerRadius = dp(14f)
                val mix = resources.getInteger(R.integer.lifeos_tile_mix)
                setColor(ColorUtils.setAlphaComponent(tc, mix * 255 / 100))
            }
        }
        val icon = ImageView(this).apply {
            setImageResource(typeIcon(payload.optString("type")))
            setColorFilter(tcText)
        }
        tile.addView(icon, FrameLayout.LayoutParams(px(22f), px(22f), Gravity.CENTER))
        top.addView(tile, LinearLayout.LayoutParams(px(48f), px(48f)))

        top.addView(
            text(SimpleDateFormat("HH:mm", Locale.UK).format(Date(at)), 56f, true, colour(R.color.lifeos_foreground)).apply {
                letterSpacing = -0.03f
                fontFeatureSettings = "tnum"
                includeFontPadding = false
            },
            gap(12f),
        )
        top.addView(
            text(SimpleDateFormat("EEE d MMM", Locale.UK).format(Date(at)), 14f, false, colour(R.color.lifeos_muted_foreground)),
            gap(12f),
        )
        top.addView(
            text(payload.optString("title"), 24f, true, colour(R.color.lifeos_foreground)).apply {
                letterSpacing = -0.025f
                maxLines = 3
                ellipsize = TextUtils.TruncateAt.END
                gravity = Gravity.CENTER
            },
            gap(24f),
        )

        // At the foot: Stop, Snooze 1 hour, Done for a Completable Item.
        val foot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        column.addView(foot, LinearLayout.LayoutParams(-1, -2))
        foot.addView(button("Stop", tc, tcForeground, null) { AlarmService.press(this, AlarmService.STOP) }, buttonParams(0f))
        foot.addView(
            button("Snooze 1 hour", colour(R.color.lifeos_secondary), colour(R.color.lifeos_foreground), null) {
                AlarmService.press(this, AlarmService.SNOOZE)
            },
            buttonParams(10f),
        )
        if (AlarmService.completable(payload)) {
            foot.addView(
                button("Done", colour(R.color.lifeos_card), colour(R.color.lifeos_foreground), colour(R.color.lifeos_hairline)) {
                    AlarmService.press(this, AlarmService.DONE)
                },
                buttonParams(10f),
            )
        }

        // A third of the way down (22% from the top, as the spec's page); the
        // foot above the gesture bar.
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val height = resources.displayMetrics.heightPixels
            top.setPadding(0, (height * 0.22f).toInt(), 0, 0)
            column.setPadding(px(20f), bars.top, px(20f), bars.bottom + px(36f))
            insets
        }
        return root
    }

    /** One of LifeOS's font's weights (res/font, scripts/android-fonts.py); the phone's if it can't load. */
    private fun font(id: Int): Typeface =
        runCatching { ResourcesCompat.getFont(this, id) }.getOrNull() ?: Typeface.DEFAULT

    private fun text(value: String, sp: Float, bold: Boolean, colour: Int) = TextView(this).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        setTextColor(colour)
        // LifeOS's font (tokens.md): the time and title at 750, the date at 400.
        typeface = font(if (bold) R.font.plus_jakarta_sans_heavy else R.font.plus_jakarta_sans_regular)
        gravity = Gravity.CENTER_HORIZONTAL
    }

    private fun gap(top: Float) = LinearLayout.LayoutParams(-2, -2).apply {
        topMargin = px(top)
        gravity = Gravity.CENTER_HORIZONTAL
    }

    private fun buttonParams(top: Float) = LinearLayout.LayoutParams(-1, px(40f)).apply { topMargin = px(top) }

    private fun button(label: String, fill: Int, ink: Int, stroke: Int?, onPress: () -> Unit) = TextView(this).apply {
        text = label
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        setTextColor(ink)
        typeface = font(R.font.plus_jakarta_sans_semibold)
        gravity = Gravity.CENTER
        isClickable = true
        isFocusable = true
        background = GradientDrawable().apply {
            cornerRadius = dp(12f)
            setColor(fill)
            if (stroke != null) setStroke(px(1f), stroke)
        }
        setOnClickListener {
            onPress()
            finish()
        }
    }
}
