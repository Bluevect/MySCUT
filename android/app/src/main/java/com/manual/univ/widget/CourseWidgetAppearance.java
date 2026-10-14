package com.manual.univ.widget;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;

import org.json.JSONObject;

final class CourseWidgetAppearance {
    private CourseWidgetAppearance() {}

    static Palette resolvePalette(Context context, JSONObject appearance) {
        String mode = appearance == null ? "system" : appearance.optString("mode", "system");
        boolean isDark =
                "dark".equals(mode)
                        || ("system".equals(mode)
                                && (context.getResources().getConfiguration().uiMode
                                                & Configuration.UI_MODE_NIGHT_MASK)
                                        == Configuration.UI_MODE_NIGHT_YES);
        JSONObject selectedPalette =
                appearance == null ? null : appearance.optJSONObject(isDark ? "dark" : "light");

        return new Palette(
                CourseWidgetColorUtils.readColor(
                        selectedPalette,
                        "backgroundColor",
                        // Matches the bg-surface-alt token, used before anything has been synced.
                        isDark ? Color.rgb(33, 41, 56) : Color.rgb(248, 250, 255)),
                CourseWidgetColorUtils.readColor(
                        selectedPalette,
                        "primaryTextColor",
                        isDark ? Color.rgb(228, 233, 242) : Color.rgb(31, 31, 31)),
                CourseWidgetColorUtils.readColor(
                        selectedPalette,
                        "secondaryTextColor",
                        isDark ? Color.rgb(168, 178, 197) : Color.rgb(114, 128, 154)));
    }

    record Palette(int backgroundColor, int primaryTextColor, int secondaryTextColor) {}

    static boolean showsRemainingLessons(JSONObject appearance) {
        return appearance == null || appearance.optBoolean("showRemaining", true);
    }
}
