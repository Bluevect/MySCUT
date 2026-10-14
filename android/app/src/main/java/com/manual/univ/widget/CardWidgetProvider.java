package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

// Home screen entry point for the card styled course widget.
public class CardWidgetProvider extends AppWidgetProvider {
    public static void refreshAll(Context context) {
        CardWidgetRenderer.refreshAll(context);
    }

    static boolean hasPlacedWidget(Context context) {
        return CourseWidgetRefresh.hasPlacedWidget(context, CardWidgetProvider.class);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CardWidgetRenderer.update(context, appWidgetManager, appWidgetIds);
    }

    // The host reports the size again after a configuration change, so re-render here.
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
