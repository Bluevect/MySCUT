package com.manual.univ.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

public class CourseWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_REFRESH_COURSE_WIDGET =
            "com.manual.univ.widget.ACTION_REFRESH_COURSE_WIDGET";

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
        if (ACTION_REFRESH_COURSE_WIDGET.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_CONFIGURATION_CHANGED.equals(action)) {
            refreshAll(context);
        }
    }

    static void scheduleNextRefresh(Context context, long triggerAtMillis) {
        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, CourseWidgetProvider.class);
        intent.setAction(ACTION_REFRESH_COURSE_WIDGET);
        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        0,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (triggerAtMillis <= System.currentTimeMillis()) {
            alarmManager.cancel(pendingIntent);
            return;
        }

        alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC, triggerAtMillis, pendingIntent);
    }
}
