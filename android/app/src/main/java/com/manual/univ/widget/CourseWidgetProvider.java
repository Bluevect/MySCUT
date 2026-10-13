package com.manual.univ.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class CourseWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_REFRESH_COURSE_WIDGET =
            "com.manual.univ.widget.ACTION_REFRESH_COURSE_WIDGET";

    // The matching AlarmManager constant is API 31+, so the literal keeps older devices safe.
    private static final String ACTION_EXACT_ALARM_PERMISSION_GRANTED =
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED";

    public static void refreshAll(Context context) {
        CourseWidgetRenderer.refreshAll(context);
    }

    static boolean hasPlacedWidget(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, CourseWidgetProvider.class))
                        .length
                > 0;
    }

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            // No permission is needed before Android 12.
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    static void scheduleNextRefresh(Context context, long triggerAtMillis) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
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

        if (canScheduleExactAlarms(context)) {
            try {
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                return;
            } catch (SecurityException error) {
                // The permission can be revoked at any time, so fall back to the inexact alarm.
            }
        }

        // RTC does not wake the device, so Doze would defer this alarm until the device wakes.
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
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
                || ACTION_EXACT_ALARM_PERMISSION_GRANTED.equals(action)
                || Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_CONFIGURATION_CHANGED.equals(action)) {
            refreshAll(context);
        }
    }
}
