package uk.joestables.lifeos

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.widget.RemoteViews
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.AndroidRemoteViews
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
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
import androidx.glance.unit.ColorProvider
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The Today widget (WID-002, components.md#todaywidget, ADR-0064): the date
 * opening Plan, "+" opening the Add list on the widget (a Type chosen opens
 * its new popup in the app), and today's cards in
 * Plan's order as widget lines, scrolling; "Nothing planned"; signed out,
 * "Sign in to LifeOS". In LifeOS's font; dark or light with the phone; no
 * checkboxes.
 */
class TodayWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val signedIn = PlanStore.signedIn(context)
        val cards = PlanStore.cards(context)
        val now = System.currentTimeMillis()
        val choices = PlanStore.choices(context)
        val adding = choices != null && PlanStore.adding(context)
        provideContent { Content(context, signedIn, cards, now, choices, adding) }
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

/** "+" and ×: the widget's Add list opened or closed, on the widget itself (WID-002 8). */
class ToggleAdd : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        PlanStore.setAdding(context, !PlanStore.adding(context))
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
private fun Content(
    context: Context,
    signedIn: Boolean,
    cards: JSONArray?,
    now: Long,
    choices: JSONArray?,
    adding: Boolean,
) {
    Column(
        modifier = GlanceModifier.fillMaxSize().cornerRadius(24.dp)
            .background(colour(R.color.lifeos_background)).padding(14.dp),
    ) {
        if (!signedIn) {
            SignedOut(context)
            return@Column
        }
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = GlanceModifier.defaultWeight().clickable(open(context, "/plan"))) {
                Words(context, R.layout.widget_date, SimpleDateFormat("EEE d MMM", Locale.UK).format(Date(now)))
            }
            Box(
                modifier = GlanceModifier.size(32.dp).cornerRadius(10.dp)
                    .background(colour(R.color.lifeos_secondary))
                    // The Add list on the widget; until the app has given its
                    // Types, Plan's own "+".
                    .clickable(if (choices != null) actionRunCallback<ToggleAdd>() else open(context, "/plan?add=1")),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    ImageProvider(if (adding) R.drawable.ic_x else R.drawable.ic_plus),
                    contentDescription = if (adding) "Close" else "Add to today",
                    modifier = GlanceModifier.size(16.dp),
                    colorFilter = ColorFilter.tint(colour(R.color.lifeos_foreground)),
                )
            }
        }
        Spacer(GlanceModifier.height(10.dp))
        if (adding && choices != null) {
            AddList(context, choices)
            return@Column
        }
        val list = (0 until (cards?.length() ?: 0)).mapNotNull { cards?.optJSONObject(it) }
        if (list.isEmpty()) {
            Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Words(context, R.layout.widget_note, "Nothing planned")
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
 * The Add list (WID-002 8, as Plan's "+", components.md AddToDay): "Add to
 * today", then each Schedulable Type with its icon in its colour; one
 * chosen opens its new popup in the app, dated today.
 */
@Composable
private fun AddList(context: Context, choices: JSONArray) {
    val list = (0 until choices.length()).mapNotNull { choices.optJSONObject(it) }
    Column(modifier = GlanceModifier.fillMaxSize()) {
        Words(context, R.layout.widget_note, "Add to today")
        Spacer(GlanceModifier.height(8.dp))
        LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
            items(list, itemId = { it.optString("key").hashCode().toLong() }) { choice ->
                Column {
                    Box(
                        modifier = GlanceModifier.fillMaxWidth().height(40.dp).cornerRadius(12.dp)
                            .background(colour(R.color.lifeos_hairline)).padding(1.dp)
                            .clickable(open(context, "/plan?add=" + Uri.encode(choice.optString("key")))),
                    ) {
                        Row(
                            modifier = GlanceModifier.fillMaxSize().cornerRadius(11.dp)
                                .background(colour(R.color.lifeos_card)).padding(horizontal = 11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Image(
                                ImageProvider(typeIcon(choice.optString("key"))),
                                contentDescription = null,
                                modifier = GlanceModifier.size(16.dp),
                                colorFilter = ColorFilter.tint(colour(typeText(choice.optString("colour")))),
                            )
                            Spacer(GlanceModifier.width(10.dp))
                            Box(modifier = GlanceModifier.defaultWeight()) {
                                Words(context, R.layout.widget_title, choice.optString("label"))
                            }
                        }
                    }
                    Spacer(GlanceModifier.height(6.dp))
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
            Box(modifier = GlanceModifier.defaultWeight()) {
                val title = card.optString("title")
                Words(
                    context,
                    if (past) R.layout.widget_title_past else R.layout.widget_title,
                    if (past) {
                        SpannableString(title).apply {
                            setSpan(StrikethroughSpan(), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                        }
                    } else {
                        title
                    },
                )
            }
            if (time != null) {
                Spacer(GlanceModifier.width(8.dp))
                Words(context, R.layout.widget_time, time)
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
        Words(context, R.layout.widget_note, "Sign in to LifeOS")
    }
}

/**
 * Words in LifeOS's font (tokens.md): Glance draws text only in the phone's
 * fonts, so the widget's text is a TextView of its own layout
 * (res/layout/widget_*.xml), carrying the font, size and colour.
 */
@Composable
private fun Words(context: Context, layout: Int, text: CharSequence) {
    val views = RemoteViews(context.packageName, layout)
    views.setTextViewText(R.id.text, text)
    AndroidRemoteViews(views)
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
