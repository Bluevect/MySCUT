package com.manual.univ.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.util.DisplayMetrics;
import android.view.View;
import android.widget.RemoteViews;

import com.manual.univ.R;

import org.json.JSONObject;

import java.util.List;

// Binding helpers shared by the course widget layouts, which use the same view ids for the header
// and for the course text.
final class CourseWidgetRemoteViews {
    // A style decides how its own accent view is painted.
    interface AccentBinder {
        void bind(Context context, RemoteViews views, int slot, int color);
    }

    private CourseWidgetRemoteViews() {}

    // Both styles paint a rounded accent bitmap, stretched across the accent view by fitXY.
    // Two rules keep it simple: the bitmap must keep a non zero intrinsic size, because ImageView
    // skips drawing entirely when an intrinsic dimension is 0, and its intrinsic height also feeds
    // the measurement of the wrap_content course row. Each style therefore passes a height below its
    // own text height, which leaves the row sized by the course text.
    static Bitmap createRoundedBitmap(
            Context context, int widthDp, int heightDp, float radiusDp, int color) {
        DisplayMetrics metrics = context.getResources().getDisplayMetrics();
        int width = Math.max(1, Math.round(widthDp * metrics.density));
        int height = Math.max(1, Math.round(heightDp * metrics.density));
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        float radius = radiusDp * metrics.density;
        canvas.drawRoundRect(0f, 0f, width, height, radius, radius, paint);
        return bitmap;
    }

    static void bindClickTargets(
            Context context, RemoteViews views, int appWidgetId, int[] clickableViewIds) {
        Intent launchIntent =
                context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            return;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launchPendingIntent =
                PendingIntent.getActivity(
                        context,
                        appWidgetId,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int viewId : clickableViewIds) {
            views.setOnClickPendingIntent(viewId, launchPendingIntent);
        }
    }

    static void bindAppearance(
            RemoteViews views, JSONObject appearance, CourseWidgetAppearance.Palette palette) {
        if (CourseWidgetAppearance.followsSystemAppearance(appearance)) {
            return;
        }

        views.setInt(R.id.widget_root, "setBackgroundColor", palette.backgroundColor());
        views.setTextColor(R.id.widget_schedule_name, palette.primaryTextColor());
        views.setTextColor(R.id.widget_date, palette.primaryTextColor());
        views.setTextColor(R.id.widget_week, palette.primaryTextColor());
        views.setTextColor(R.id.widget_status, palette.secondaryTextColor());
        views.setTextColor(R.id.widget_footer, palette.secondaryTextColor());
    }

    static void bindHeader(
            Context context, RemoteViews views, CourseWidgetContent.Snapshot content) {
        views.setTextViewText(R.id.widget_schedule_name, content.scheduleName());
        views.setTextViewText(R.id.widget_date, content.dateLabel());
        views.setTextViewText(R.id.widget_week, content.weekLabel());
        views.setTextViewText(R.id.widget_footer, context.getString(R.string.course_widget_title));
    }

    static void bindLessons(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Snapshot content,
            String dayFinishedText,
            AccentBinder accentBinder) {
        List<CourseWidgetContent.Lesson> lessons = content.lessons();
        if (lessons.isEmpty()) {
            views.setViewVisibility(R.id.course_1_card, View.GONE);
            views.setViewVisibility(R.id.course_2_card, View.GONE);
            views.setViewVisibility(
                    R.id.widget_status, content.hasLessonsToday() ? View.VISIBLE : View.GONE);
            if (content.hasLessonsToday()) {
                views.setTextViewText(R.id.widget_status, dayFinishedText);
            }
            return;
        }

        views.setViewVisibility(R.id.widget_status, View.GONE);
        bindLesson(context, views, content, lessons.get(0), 1, accentBinder);

        if (lessons.size() > 1) {
            bindLesson(context, views, content, lessons.get(1), 2, accentBinder);
        } else {
            views.setViewVisibility(R.id.course_2_card, View.GONE);
        }
    }

    private static void bindLesson(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Snapshot content,
            CourseWidgetContent.Lesson lesson,
            int slot,
            AccentBinder accentBinder) {
        int cardViewId = slot == 1 ? R.id.course_1_card : R.id.course_2_card;
        int nameViewId = slot == 1 ? R.id.course_1_name : R.id.course_2_name;
        int placeViewId = slot == 1 ? R.id.course_1_place : R.id.course_2_place;
        int startTimeViewId = slot == 1 ? R.id.course_1_start_time : R.id.course_2_start_time;
        int endTimeViewId = slot == 1 ? R.id.course_1_end_time : R.id.course_2_end_time;

        views.setTextViewText(nameViewId, lesson.name());
        views.setTextViewText(placeViewId, lesson.place());
        views.setTextViewText(startTimeViewId, lesson.startTime());
        views.setTextViewText(endTimeViewId, lesson.endTime());
        views.setTextColor(nameViewId, content.primaryTextColor());
        views.setTextColor(placeViewId, content.secondaryTextColor());
        views.setTextColor(startTimeViewId, content.secondaryTextColor());
        views.setTextColor(endTimeViewId, content.secondaryTextColor());
        views.setViewVisibility(cardViewId, View.VISIBLE);
        accentBinder.bind(context, views, slot, lesson.accentColor());
    }
}
