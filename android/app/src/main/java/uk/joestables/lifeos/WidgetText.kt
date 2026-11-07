package uk.joestables.lifeos

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.text.TextPaint
import android.text.TextUtils
import android.util.TypedValue
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.layout.ContentScale
import androidx.glance.layout.size
import androidx.glance.unit.ColorProvider
import kotlin.math.ceil
import kotlin.math.max

/**
 * Words drawn as a picture in LifeOS's font (tokens.md), for the Today
 * widget's scrolling list: Glance draws text only in the phone's fonts, and
 * the TextView layouts that carry LifeOS's font elsewhere on the widget
 * don't show inside a widget's scrolling list (Joe on 0.1.9). Drawn in
 * white at the phone's density, cut with an ellipsis to the room it has,
 * and tinted where it shows by a colour the launcher resolves, so it
 * follows the phone from dark to light without the widget being drawn
 * again (a picture drawn in one theme's colour stayed in it).
 */
object WidgetText {
    class Drawn(val bitmap: Bitmap, val widthDp: Float, val heightDp: Float)

    fun draw(
        context: Context,
        text: String,
        sp: Float,
        font: Int,
        maxWidthDp: Float = Float.MAX_VALUE,
        struck: Boolean = false,
    ): Drawn {
        val metrics = context.resources.displayMetrics
        val paint = TextPaint(TextPaint.ANTI_ALIAS_FLAG).apply {
            typeface = runCatching { ResourcesCompat.getFont(context, font) }.getOrNull()
            textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, metrics)
            color = android.graphics.Color.WHITE
            isStrikeThruText = struck
        }
        val room = max(1f, maxWidthDp * metrics.density)
        val shown = TextUtils.ellipsize(text, paint, room, TextUtils.TruncateAt.END).toString()
        val fm = paint.fontMetrics
        val width = max(1, ceil(paint.measureText(shown)).toInt())
        val height = max(1, ceil(fm.descent - fm.ascent).toInt())
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        Canvas(bitmap).drawText(shown, 0f, -fm.ascent, paint)
        return Drawn(bitmap, width / metrics.density, height / metrics.density)
    }

    @Composable
    fun Picture(drawn: Drawn, words: String, colour: Int) {
        Image(
            ImageProvider(drawn.bitmap),
            contentDescription = words,
            modifier = GlanceModifier.size(drawn.widthDp.dp, drawn.heightDp.dp),
            contentScale = ContentScale.Fit,
            colorFilter = ColorFilter.tint(ColorProvider(colour)),
        )
    }
}
