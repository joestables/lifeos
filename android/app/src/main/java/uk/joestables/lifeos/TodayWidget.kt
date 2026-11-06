package uk.joestables.lifeos

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextDecoration
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The Today widget (WID-002, components.md#todaywidget, ADR-0064): the date
 * opening Plan, "+" opening Plan's Add for today, and today's cards in
 * Plan's order as widget lines, scrolling; "Nothing planned"; signed out,
 * "Sign in to LifeOS". Dark or light with the phone; no checkboxes.
 */
class TodayWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val signedIn = PlanStore.signedIn(context)
        val cards = PlanStore.cards(context)
        val now = System.currentTimeMillis()
        provideContent { Content(context, signedIn, cards, now) }
    }
}

/** Android's half-hourly update, and adding the widget: the phone's Plan fetched afresh too. */
class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = TodayWidget()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        if (PlanStore.signedIn(context)) SyncWorker.now(context)
    }
}

private fun colour(id: Int) = ColorProvider(id)

/** Opens the app on a path, as a joestables.uk link does (AND-003 3). */
private fun open(context: Context, path: String): Action = actionStartActivity(
    Intent(Intent.ACTION_VIEW, Uri.parse("https://joestables.uk$path"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
)

@Composable
private fun Content(context: Context, signedIn: Boolean, cards: JSONArray?, now: Long) {
    Column(
        modifier = GlanceModifier.fillMaxSize().cornerRadius(24.dp)
            .background(colour(R.color.lifeos_background)).padding(14.dp),
    ) {
        if (!signedIn) {
            SignedOut(context)
            return@Column
        }
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                SimpleDateFormat("EEE d MMM", Locale.UK).format(Date(now)),
                modifier = GlanceModifier.defaultWeight().clickable(open(context, "/plan")),
                style = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colour(R.color.lifeos_foreground)),
                maxLines = 1,
            )
            Box(
                modifier = GlanceModifier.size(32.dp).cornerRadius(10.dp)
                    .background(colour(R.color.lifeos_secondary))
                    .clickable(open(context, "/plan?add=1")),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    ImageProvider(R.drawable.ic_plus),
                    contentDescription = "Add to today",
                    modifier = GlanceModifier.size(16.dp),
                    colorFilter = ColorFilter.tint(colour(R.color.lifeos_foreground)),
                )
            }
        }
        Spacer(GlanceModifier.height(10.dp))
        val list = (0 until (cards?.length() ?: 0)).mapNotNull { cards?.optJSONObject(it) }
        if (list.isEmpty()) {
            Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "Nothing planned",
                    style = TextStyle(fontSize = 13.sp, color = colour(R.color.lifeos_muted_foreground)),
                )
            }
        } else {
            LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
                items(list, itemId = { it.optString("id").hashCode().toLong() }) { card ->
                    Column {
                        Line(context, card, now)
                        Spacer(GlanceModifier.height(6.dp))
                    }
                }
            }
        }
    }
}

/**
 * A widget line: 40dp, the card fill inside a hairline edge, the Type's
 * icon in its text colour, the title, and its time at the end; done or
 * gone by, muted and struck through (Android's widgets can't fade).
 */
@Composable
private fun Line(context: Context, card: JSONObject, now: Long) {
    val ends = card.optString("ends").takeIf { it.isNotEmpty() && it != "null" }?.let { ReminderSync.epochMillis(it) }
    val past = card.optBoolean("done") || (ends != null && ends <= now)
    val ink = if (past) R.color.lifeos_muted_foreground else R.color.lifeos_foreground
    val time = card.optString("time").takeIf { it.isNotEmpty() && it != "null" }
    Box(
        modifier = GlanceModifier.fillMaxWidth().height(40.dp).cornerRadius(12.dp)
            .background(colour(R.color.lifeos_hairline)).padding(1.dp)
            .clickable(open(context, "/item/" + card.optString("id"))),
    ) {
        Row(
            modifier = GlanceModifier.fillMaxSize().cornerRadius(11.dp)
                .background(colour(R.color.lifeos_card)).padding(horizontal = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                ImageProvider(typeIcon(card.optString("type"))),
                contentDescription = card.optString("type"),
                modifier = GlanceModifier.size(16.dp),
                colorFilter = ColorFilter.tint(colour(if (past) R.color.lifeos_muted_foreground else typeText(card.optString("colour")))),
            )
            Spacer(GlanceModifier.width(10.dp))
            Text(
                card.optString("title"),
                modifier = GlanceModifier.defaultWeight(),
                maxLines = 1,
                style = TextStyle(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = colour(ink),
                    textDecoration = if (past) TextDecoration.LineThrough else TextDecoration.None,
                ),
            )
            if (time != null) {
                Spacer(GlanceModifier.width(8.dp))
                Text(time, style = TextStyle(fontSize = 12.sp, color = colour(R.color.lifeos_muted_foreground)))
            }
        }
    }
}

@Composable
private fun SignedOut(context: Context) {
    Column(
        modifier = GlanceModifier.fillMaxSize().clickable(open(context, "/")),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            ImageProvider(R.drawable.ic_stat_lifeos),
            contentDescription = null,
            modifier = GlanceModifier.size(32.dp),
            colorFilter = ColorFilter.tint(colour(R.color.lifeos_foreground)),
        )
        Spacer(GlanceModifier.height(8.dp))
        Text(
            "Sign in to LifeOS",
            style = TextStyle(fontSize = 13.sp, color = colour(R.color.lifeos_muted_foreground)),
        )
    }
}

/** The Type's text colour (tokens.md's t-*-text). */
private fun typeText(colour: String): Int = when (colour) {
    "blue" -> R.color.lifeos_t_blue_text
    "yellow" -> R.color.lifeos_t_yellow_text
    "coral" -> R.color.lifeos_t_coral_text
    "green" -> R.color.lifeos_t_green_text
    "orange" -> R.color.lifeos_t_orange_text
    "purple" -> R.color.lifeos_t_purple_text
    else -> R.color.lifeos_muted_foreground
}

/** The Type's icon, as colours.ts's TYPE_ICONS (scripts/android-type-icons.mjs). */
fun typeIcon(type: String): Int = when (type) {
    "thought" -> R.drawable.ic_type_thought
    "note" -> R.drawable.ic_type_note
    "task" -> R.drawable.ic_type_task
    "event" -> R.drawable.ic_type_event
    "recipe", "variation" -> R.drawable.ic_type_recipe
    "meal" -> R.drawable.ic_type_meal
    "shopping_list" -> R.drawable.ic_type_shopping_list
    "exercise", "workout" -> R.drawable.ic_type_exercise
    "workout_template" -> R.drawable.ic_type_workout_template
    else -> R.drawable.ic_stat_lifeos
}
