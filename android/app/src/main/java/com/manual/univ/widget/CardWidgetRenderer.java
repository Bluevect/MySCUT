package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Card style: every course keeps a filled and rounded colour card as its background.
final class CardWidgetRenderer {
    // Below the height of the padded course text, so the row stays sized by that text. The width only
    // has to stay close to the real card width to keep the rounded corners round.
    private static final int ACCENT_WIDTH_DP = 240;
    private static final int ACCENT_HEIGHT_DP = 48;
    private static final float ACCENT_CORNER_RADIUS_DP = 8.0f;

    private static final int[] CLICKABLE_VIEW_IDS = {
        R.id.widget_root,
        R.id.widget_header,
        R.id.widget_schedule_name,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
        R.id.course_1_card,
        R.id.course_1_bg,
        R.id.course_1_name,
        R.id.course_1_place,
        R.id.course_1_start_time,
        R.id.course_1_end_time,
        R.id.course_2_card,
        R.id.course_2_bg,
        R.id.course_2_name,
        R.id.course_2_place,
        R.id.course_2_start_time,
        R.id.course_2_end_time,
        R.id.widget_footer
    };

    private CardWidgetRenderer() {}

    static void refreshAll(Context context) {
        int[] widgetIds = CourseWidgetRefresh.getWidgetIds(context, CardWidgetProvider.class);
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
                context, CardWidgetProvider.class, content.nextRefreshAt());

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.card_widget_layout);
            CourseWidgetRemoteViews.bindClickTargets(
                    context, views, appWidgetId, CLICKABLE_VIEW_IDS);
            CourseWidgetRemoteViews.bindAppearance(views, data.appearance(), palette);
            CourseWidgetRemoteViews.bindHeader(context, views, content);
            CourseWidgetRemoteViews.bindLessons(
                    context,
                    views,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    CardWidgetRenderer::bindAccent);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
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
