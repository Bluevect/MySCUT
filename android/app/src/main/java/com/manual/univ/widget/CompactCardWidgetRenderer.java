package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Compact card style, two courses with the lesson time as one label on a third line.
final class CompactCardWidgetRenderer {
    private static final int[] CLICKABLE_VIEW_IDS = {
        R.id.widget_root,
        R.id.widget_header,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
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
            CourseWidgetRemoteViews.bindCompactSurface(views, palette);
            CourseWidgetRemoteViews.bindHeader(views, content, content.shortDateLabel());
            CourseWidgetRemoteViews.bindScrollableLessons(
                    context,
                    views,
                    appWidgetId,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    CourseWidgetRemoteViews.LessonStyle.COMPACT_CARD,
                    palette,
                    false);
            CourseWidgetRemoteViews.bindSquareContent(
                    context, appWidgetManager, appWidgetId, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
            CourseWidgetRemoteViews.notifyLessonListChanged(
                    appWidgetManager, appWidgetId);
        }
    }
}
