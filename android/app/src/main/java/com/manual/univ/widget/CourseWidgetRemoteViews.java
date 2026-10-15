package com.manual.univ.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.SizeF;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.RequiresApi;
import androidx.core.os.BundleCompat;

import com.manual.univ.R;

import java.util.List;

// Binding helpers shared by every course widget layout, which uses the same view ids.
final class CourseWidgetRemoteViews {
    // A style decides how its own accent view is painted.
    interface AccentBinder {
        void bind(Context context, RemoteViews views, int slot, int color);
    }

    // Lesson time either uses a start and an end view, or one label on the start view.
    enum LessonTimeLayout {
        SPLIT,
        RANGE
    }

    // How many course slots a layout holds, and whether empty slots stay blank instead of collapsing.
    record LessonSlots(int count, LessonTimeLayout timeLayout, boolean keepsEmptySlots) {}

    // Course text colors, from the schedule theme on cards and from the widget appearance on bars.
    record LessonTextColors(int primary, int secondary) {}

    record WidgetSize(int widthDp, int heightDp) {}

    // Clears a slot when a layout reserves space for a lesson that does not exist.
    private static final CourseWidgetContent.Lesson BLANK_LESSON =
            new CourseWidgetContent.Lesson("", "", "", "", Color.TRANSPARENT);

    private CourseWidgetRemoteViews() {}

    // Height the content block needs at that width, measured instead of hard coded.
    static int measureContentHeight(Context context, int layoutRes, int widthPx) {
        View root = LayoutInflater.from(context).inflate(layoutRes, null);
        View content = root.findViewById(R.id.widget_content);
        if (content == null) {
            return 0;
        }

        content.measure(
                View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
        return content.getMeasuredHeight();
    }

    static WidgetSize resolveWidgetSize(Context context, Bundle options) {
        // Use Android 12+ API first
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SizeF current = pickCurrentSize(readWidgetSizes(options), isLandscape(context));
            if (current != null) {
                return new WidgetSize(
                        Math.round(current.getWidth()), Math.round(current.getHeight()));
            }
        }

        // Fallback to bounds
        boolean landscape = isLandscape(context);
        return new WidgetSize(
                options.getInt(
                        landscape
                                ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH
                                : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
                options.getInt(
                        landscape
                                ? AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT
                                : AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT));
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private static List<SizeF> readWidgetSizes(Bundle options) {
        return BundleCompat.getParcelableArrayList(
                options,
                AppWidgetManager.OPTION_APPWIDGET_SIZES,
                SizeF.class
        );
    }

    private static SizeF pickCurrentSize(List<SizeF> sizes, boolean landscape) {
        if (sizes == null || sizes.isEmpty()) {
            return null;
        }

        SizeF fallback = null;

        for (SizeF size : sizes) {
            if (size == null || size.getWidth() <= 0 || size.getHeight() <= 0) {
                continue;
            }

            if (fallback == null) {
                fallback = size;
            }

            if ((size.getWidth() > size.getHeight()) == landscape) {
                return size;
            }
        }

        return fallback;
    }

    private static boolean isLandscape(Context context) {
        return context.getResources().getConfiguration().orientation
                == Configuration.ORIENTATION_LANDSCAPE;
    }

    // Rounded accent bitmap. Keep a non-zero size, and a height below the course text.
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

    // Applied on every update, because a re-applied RemoteViews is not re-inflated.
    static void bindTextColors(RemoteViews views, CourseWidgetAppearance.Palette palette) {
        views.setTextColor(R.id.widget_schedule_name, palette.primaryTextColor());
        views.setTextColor(R.id.widget_date, palette.primaryTextColor());
        views.setTextColor(R.id.widget_week, palette.primaryTextColor());
        views.setTextColor(R.id.widget_status, palette.secondaryTextColor());
        views.setTextColor(R.id.widget_footer, palette.secondaryTextColor());
    }

    // Tints the rounded compact surface.
    // The tint API is 31+, so older hosts keep the default color.
    static void bindCompactSurface(RemoteViews views, CourseWidgetAppearance.Palette palette) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorStateList(
                    R.id.widget_content,
                    "setBackgroundTintList",
                    ColorStateList.valueOf(palette.backgroundColor()));
        }
    }

    static void bindHeader(
            RemoteViews views, CourseWidgetContent.Snapshot content, String dateLabel) {
        views.setViewVisibility(R.id.widget_header, View.VISIBLE);
        views.setTextViewText(R.id.widget_schedule_name, content.scheduleName());
        views.setTextViewText(R.id.widget_date, dateLabel);
        views.setTextViewText(R.id.widget_week, content.weekLabel());
    }

    // Counts the lessons still to come
    static void bindFooter(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Snapshot content,
            boolean showsFooter) {
        int remaining = content.lessons().size();
        boolean visible = showsFooter && remaining > 0;
        views.setViewVisibility(R.id.widget_footer, visible ? View.VISIBLE : View.GONE);
        if (visible) {
            views.setTextViewText(
                    R.id.widget_footer,
                    context.getString(R.string.course_widget_remaining, remaining));
        }
    }

    static void bindLessons(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Snapshot content,
            String dayFinishedText,
            LessonTextColors textColors,
            LessonSlots slots,
            AccentBinder accentBinder) {
        List<CourseWidgetContent.Lesson> lessons = content.lessons();

        // Nothing has been synced yet, so the widget explains itself instead of sitting blank.
        if (!content.hasScheduleData()) {
            views.setViewVisibility(R.id.widget_header, View.GONE);
            views.setViewVisibility(R.id.course_1_card, View.GONE);
            if (slots.count() > 1) {
                views.setViewVisibility(R.id.course_2_card, View.GONE);
            }
            views.setViewVisibility(R.id.widget_status, View.VISIBLE);
            views.setTextViewText(
                    R.id.widget_status, context.getString(R.string.course_widget_no_data));
            return;
        }

        if (content.semesterNotStarted()) {
            views.setViewVisibility(R.id.course_1_card, View.GONE);
            if (slots.count() > 1) {
                views.setViewVisibility(R.id.course_2_card, View.GONE);
            }
            views.setViewVisibility(R.id.widget_status, View.VISIBLE);
            views.setTextViewText(
                    R.id.widget_status,
                    context.getString(R.string.course_widget_semester_not_started));
            return;
        }

        if (lessons.isEmpty()) {
            views.setViewVisibility(R.id.course_1_card, View.GONE);
            if (slots.count() > 1) {
                views.setViewVisibility(R.id.course_2_card, View.GONE);
            }
            views.setViewVisibility(R.id.widget_status, View.VISIBLE);
            views.setTextViewText(
                    R.id.widget_status,
                    content.hasLessonsToday()
                            ? dayFinishedText
                            : context.getString(R.string.course_widget_no_lessons));
            return;
        }

        views.setViewVisibility(R.id.widget_status, View.GONE);
        bindLesson(
                context,
                views,
                lessons.get(0),
                1,
                textColors,
                slots.timeLayout(),
                accentBinder);

        if (slots.count() <= 1) {
            return;
        }

        if (lessons.size() > 1) {
            bindLesson(
                    context,
                    views,
                    lessons.get(1),
                    2,
                    textColors,
                    slots.timeLayout(),
                    accentBinder);
        } else if (slots.keepsEmptySlots()) {
            bindLesson(
                    context,
                    views,
                    BLANK_LESSON,
                    2,
                    textColors,
                    slots.timeLayout(),
                    accentBinder);
        } else {
            views.setViewVisibility(R.id.course_2_card, View.GONE);
        }
    }

    private static void bindLesson(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Lesson lesson,
            int slot,
            LessonTextColors textColors,
            LessonTimeLayout timeLayout,
            AccentBinder accentBinder) {
        int cardViewId = slot == 1 ? R.id.course_1_card : R.id.course_2_card;
        int nameViewId = slot == 1 ? R.id.course_1_name : R.id.course_2_name;
        int placeViewId = slot == 1 ? R.id.course_1_place : R.id.course_2_place;

        views.setTextViewText(nameViewId, lesson.name());
        views.setTextViewText(placeViewId, lesson.place());
        views.setTextColor(nameViewId, textColors.primary());
        views.setTextColor(placeViewId, textColors.secondary());
        bindLessonTime(views, lesson, slot, textColors, timeLayout);
        views.setViewVisibility(cardViewId, View.VISIBLE);
        accentBinder.bind(context, views, slot, lesson.accentColor());
    }

    private static void bindLessonTime(
            RemoteViews views,
            CourseWidgetContent.Lesson lesson,
            int slot,
            LessonTextColors textColors,
            LessonTimeLayout timeLayout) {
        int startTimeViewId = slot == 1 ? R.id.course_1_start_time : R.id.course_2_start_time;
        views.setTextColor(startTimeViewId, textColors.secondary());

        if (timeLayout == LessonTimeLayout.RANGE) {
            views.setTextViewText(startTimeViewId, lesson.startTime() + "-" + lesson.endTime());
            return;
        }

        int endTimeViewId = slot == 1 ? R.id.course_1_end_time : R.id.course_2_end_time;
        views.setTextViewText(startTimeViewId, lesson.startTime());
        views.setTextViewText(endTimeViewId, lesson.endTime());
        views.setTextColor(endTimeViewId, textColors.secondary());
    }
}
