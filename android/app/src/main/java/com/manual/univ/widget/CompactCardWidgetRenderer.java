package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.res.ColorStateList;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Compact card style, two courses with the lesson time as one label on a third line.
final class CompactCardWidgetRenderer {
    private static final CourseWidgetRemoteViews.LessonSlots LESSON_SLOTS =
            new CourseWidgetRemoteViews.LessonSlots(
                    2, CourseWidgetRemoteViews.LessonTimeLayout.RANGE, true);

    // Keeps a sane corner aspect, and stays below the course text height so the row follows it.
    private static final int ACCENT_WIDTH_DP = 240;
    private static final int ACCENT_HEIGHT_DP = 44;
    private static final float ACCENT_CORNER_RADIUS_DP = 8.0f;

    private static final int[] CLICKABLE_VIEW_IDS = {
        R.id.widget_root,
        R.id.widget_header,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
        R.id.course_1_card,
        R.id.course_1_bg,
        R.id.course_1_name,
        R.id.course_1_place,
        R.id.course_1_start_time,
        R.id.course_2_card,
        R.id.course_2_bg,
        R.id.course_2_name,
        R.id.course_2_place,
        R.id.course_2_start_time,
        R.id.widget_footer
    };

    private CompactCardWidgetRenderer() {}

    static void refreshAll(Context context) {
        int[] widgetIds =
                CourseWidgetRefresh.getWidgetIds(context, CompactCardWidgetProvider.class);
        if (widgetIds.length > 0) {
            update(context, AppWidgetManager.getInstance(context), widgetIds);
        }
    }

    static void update(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CourseWidgetStore.WidgetData data = CourseWidgetStore.load(context);
        CourseWidgetContent.Snapshot content = CourseWidgetContent.resolve(data);
        CourseWidgetAppearance.Palette palette =
                CourseWidgetAppearance.resolvePalette(context, data.appearance());
        CourseWidgetRefresh.scheduleNextRefresh(
                context, CompactCardWidgetProvider.class, content.nextRefreshAt());

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.compact_card_widget_layout);
            CourseWidgetRemoteViews.bindClickTargets(
                    context, views, appWidgetId, CLICKABLE_VIEW_IDS);
            CourseWidgetRemoteViews.bindTextColors(views, palette);
            // Tints the rounded shape so the block matches the wide styles, box stays transparent.
            views.setColorStateList(
                    R.id.widget_content,
                    "setBackgroundTintList",
                    ColorStateList.valueOf(palette.backgroundColor()));
            CourseWidgetRemoteViews.bindHeader(context, views, content);
            CourseWidgetRemoteViews.bindLessons(
                    context,
                    views,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    new CourseWidgetRemoteViews.LessonTextColors(
                            content.primaryTextColor(), content.secondaryTextColor()),
                    LESSON_SLOTS,
                    CompactCardWidgetRenderer::bindAccent);
            applySquareContent(context, appWidgetManager, appWidgetId, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    // Pins the block to a square of the reported size
    private static void applySquareContent(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId,
            RemoteViews views) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }

        CourseWidgetRemoteViews.WidgetSize size =
                CourseWidgetRemoteViews.resolveWidgetSize(
                        context, appWidgetManager.getAppWidgetOptions(appWidgetId));

        // Get minimum side
        int sideDp = Math.min(size.widthDp(), size.heightDp());
        if (sideDp <= 0) {
            return;
        }

        int sidePx = Math.round(sideDp * context.getResources().getDisplayMetrics().density);

        // Skip when it would clip the courses
        int contentHeightPx =
                CourseWidgetRemoteViews.measureContentHeight(
                        context, R.layout.compact_card_widget_layout, sidePx);
        if (contentHeightPx > sidePx) {
            return;
        }

        views.setViewLayoutWidth(R.id.widget_content, sideDp, TypedValue.COMPLEX_UNIT_DIP);
        views.setViewLayoutHeight(R.id.widget_content, sideDp, TypedValue.COMPLEX_UNIT_DIP);
    }

    private static void bindAccent(Context context, RemoteViews views, int slot, int color) {
        int accentViewId = slot == 1 ? R.id.course_1_bg : R.id.course_2_bg;
        views.setImageViewBitmap(
                accentViewId,
                CourseWidgetRemoteViews.createRoundedBitmap(
                        context,
                        ACCENT_WIDTH_DP,
                        ACCENT_HEIGHT_DP,
                        ACCENT_CORNER_RADIUS_DP,
                        color));
    }
}
