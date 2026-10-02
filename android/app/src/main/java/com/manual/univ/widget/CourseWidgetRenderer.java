package com.manual.univ.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.manual.univ.R;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.List;

final class CourseWidgetRenderer {
    private static final String[] WEEKDAY_LABELS = {"日", "一", "二", "三", "四", "五", "六"};

    private CourseWidgetRenderer() {}

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] widgetIds =
                manager.getAppWidgetIds(
                        new android.content.ComponentName(context, CourseWidgetProvider.class));
        if (widgetIds.length > 0) {
            update(context, manager, widgetIds);
        }
    }

    static void update(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CourseWidgetStore.WidgetData data = CourseWidgetStore.load(context);
        JSONObject scheduleData = CourseWidgetCourseManager.getScheduleData(data.schedule());
        CourseWidgetAppearance.Palette palette =
                CourseWidgetAppearance.resolvePalette(context, data.appearance());

        int todayWeekday = Calendar.getInstance().get(Calendar.DAY_OF_WEEK);
        int weekdayNumber = todayWeekday == Calendar.SUNDAY ? 7 : todayWeekday - 1;
        int currentWeek = CourseWidgetCourseManager.getCurrentWeek(data.schedule());
        String scheduleName = CourseWidgetCourseManager.getScheduleName(data.schedule());
        String timeSlotPresetId = CourseWidgetCourseManager.getTimeSlotPresetId(data.schedule());
        List<JSONObject> todaysLessons =
                CourseWidgetCourseManager.getTodayLessons(scheduleData, weekdayNumber, currentWeek);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.course_widget_layout);
            setLaunchIntent(context, views, appWidgetId);
            applyAppearance(views, data.appearance(), palette);
            applyHeader(context, views, scheduleName, todayWeekday, currentWeek);
            applyLessons(
                    views,
                    scheduleData,
                    data.scheduleTheme(),
                    timeSlotPresetId,
                    todaysLessons,
                    weekdayNumber);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void setLaunchIntent(Context context, RemoteViews views, int appWidgetId) {
        Intent launchIntent =
                context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            return;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launchPendingIntent =
                PendingIntent.getActivity(
                        context,
                        appWidgetId,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        int[] clickableViewIds = {
            R.id.widget_root,
            R.id.widget_header,
            R.id.widget_schedule_name,
            R.id.widget_date,
            R.id.widget_week,
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
        for (int viewId : clickableViewIds) {
            views.setOnClickPendingIntent(viewId, launchPendingIntent);
        }
    }

    private static void applyAppearance(
            RemoteViews views, JSONObject appearance, CourseWidgetAppearance.Palette palette) {
        if (CourseWidgetAppearance.followsSystemAppearance(appearance)) {
            return;
        }

        views.setInt(R.id.widget_root, "setBackgroundColor", palette.backgroundColor());
        views.setTextColor(R.id.widget_schedule_name, palette.primaryTextColor());
        views.setTextColor(R.id.widget_date, palette.primaryTextColor());
        views.setTextColor(R.id.widget_week, palette.primaryTextColor());
        views.setTextColor(R.id.widget_footer, palette.secondaryTextColor());
    }

    private static void applyHeader(
            Context context,
            RemoteViews views,
            String scheduleName,
            int dayOfWeek,
            int currentWeek) {
        views.setTextViewText(R.id.widget_schedule_name, scheduleName);
        views.setTextViewText(R.id.widget_date, getTodayLabel(dayOfWeek));
        views.setTextViewText(R.id.widget_week, "第" + currentWeek + "周");
        views.setTextViewText(R.id.widget_footer, context.getString(R.string.course_widget_title));
    }

    private static void applyLessons(
            RemoteViews views,
            JSONObject scheduleData,
            JSONObject scheduleTheme,
            String timeSlotPresetId,
            List<JSONObject> todaysLessons,
            int weekdayNumber) {
        if (todaysLessons.isEmpty()) {
            views.setViewVisibility(R.id.course_1_card, android.view.View.GONE);
            views.setViewVisibility(R.id.course_2_card, android.view.View.GONE);
            return;
        }

        views.setViewVisibility(R.id.course_1_card, android.view.View.VISIBLE);
        CourseWidgetCourseManager.applyCourse(
                views,
                scheduleData,
                scheduleTheme,
                timeSlotPresetId,
                todaysLessons.get(0),
                weekdayNumber,
                1);

        if (todaysLessons.size() > 1) {
            views.setViewVisibility(R.id.course_2_card, android.view.View.VISIBLE);
            CourseWidgetCourseManager.applyCourse(
                    views,
                    scheduleData,
                    scheduleTheme,
                    timeSlotPresetId,
                    todaysLessons.get(1),
                    weekdayNumber,
                    2);
        } else {
            views.setViewVisibility(R.id.course_2_card, android.view.View.GONE);
        }
    }

    private static String getTodayLabel(int dayOfWeek) {
        Calendar today = Calendar.getInstance();
        return (today.get(Calendar.MONTH) + 1)
                + "月"
                + today.get(Calendar.DAY_OF_MONTH)
                + "日 星期"
                + WEEKDAY_LABELS[dayOfWeek - 1];
    }
}
