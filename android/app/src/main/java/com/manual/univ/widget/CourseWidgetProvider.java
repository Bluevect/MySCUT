package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

public class CourseWidgetProvider extends AppWidgetProvider {
    public static void refreshAll(Context context) {
        CourseWidgetRenderer.refreshAll(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CourseWidgetRenderer.update(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_CONFIGURATION_CHANGED.equals(action)) {
            refreshAll(context);
        }
    }
}
