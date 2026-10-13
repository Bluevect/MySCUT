package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Bar style: every course shows a rounded colour bar on its left instead of a filled card.
final class BarWidgetRenderer {
    private static final int ACCENT_WIDTH_DP = 4;
    // Below the height of two lines of course text, so the row stays sized by that text.
    private static final int ACCENT_HEIGHT_DP = 44;

    private static final int[] CLICKABLE_VIEW_IDS = {
        R.id.widget_root,
        R.id.widget_header,
        R.id.widget_schedule_name,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
        R.id.course_1_card,
        R.id.course_1_bar,
        R.id.course_1_name,
        R.id.course_1_place,
        R.id.course_1_start_time,
        R.id.course_1_end_time,
        R.id.course_2_card,
        R.id.course_2_bar,
        R.id.course_2_name,
        R.id.course_2_place,
        R.id.course_2_start_time,
        R.id.course_2_end_time,
        R.id.widget_footer
    };

    private BarWidgetRenderer() {}

    static void refreshAll(Context context) {
        int[] widgetIds = CourseWidgetRefresh.getWidgetIds(context, BarWidgetProvider.class);
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
                context, BarWidgetProvider.class, content.nextRefreshAt());

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.bar_widget_layout);
            CourseWidgetRemoteViews.bindClickTargets(
                    context, views, appWidgetId, CLICKABLE_VIEW_IDS);
            CourseWidgetRemoteViews.bindAppearance(views, data.appearance(), palette);
            CourseWidgetRemoteViews.bindHeader(context, views, content);
            CourseWidgetRemoteViews.bindLessons(
                    context,
                    views,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    BarWidgetRenderer::bindAccent);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void bindAccent(Context context, RemoteViews views, int slot, int color) {
        int accentViewId = slot == 1 ? R.id.course_1_bar : R.id.course_2_bar;
        views.setImageViewBitmap(
                accentViewId,
                CourseWidgetRemoteViews.createRoundedBitmap(
                        context, ACCENT_WIDTH_DP, ACCENT_HEIGHT_DP, ACCENT_WIDTH_DP / 2.0f, color));
    }
}
