package com.manual.univ.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

final class CourseWidgetStore {
    static final String PREFERENCES_NAME = "CapacitorStorage";
    static final String ACTIVE_SCHEDULE_KEY = "course-widget-active-schedule";
    static final String SCHEDULE_THEME_KEY = "course-widget-schedule-theme";
    static final String APPEARANCE_KEY = "course-widget-appearance";

    private CourseWidgetStore() {}

    static WidgetData load(Context context) {
        SharedPreferences preferences =
                context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        return new WidgetData(
                readJson(preferences, ACTIVE_SCHEDULE_KEY),
                readJson(preferences, SCHEDULE_THEME_KEY),
                readJson(preferences, APPEARANCE_KEY));
    }

    static void saveSchedule(Context context, String scheduleJson, String scheduleThemeJson) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(ACTIVE_SCHEDULE_KEY, scheduleJson)
                .putString(SCHEDULE_THEME_KEY, scheduleThemeJson)
                .apply();
    }

    static void saveAppearance(Context context, String appearanceJson) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(APPEARANCE_KEY, appearanceJson)
                .apply();
    }

    private static JSONObject readJson(SharedPreferences preferences, String key) {
        String value = preferences.getString(key, null);
        if (value == null) {
            return null;
        }

        try {
            return new JSONObject(value);
        } catch (JSONException error) {
            return null;
        }
    }

    record WidgetData(JSONObject schedule, JSONObject scheduleTheme, JSONObject appearance) {}
}
