package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

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

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && CourseWidgetRefresh.isRefreshTrigger(intent.getAction())) {
            refreshAll(context);
        }
    }
}
