package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

// Home screen entry point for the compact bar styled course widget.
public class CompactBarWidgetProvider extends AppWidgetProvider {
    public static void refreshAll(Context context) {
        CompactBarWidgetRenderer.refreshAll(context);
    }

    static boolean hasPlacedWidget(Context context) {
        return CourseWidgetRefresh.hasPlacedWidget(context, CompactBarWidgetProvider.class);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CompactBarWidgetRenderer.update(context, appWidgetManager, appWidgetIds);
    }

    // The square sizing reads the reported size, so a resize has to re-render.
    @Override
    public void onAppWidgetOptionsChanged(
            Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        refreshAll(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && CourseWidgetRefresh.isRefreshTrigger(intent.getAction())) {
            refreshAll(context);
        }
    }
}
