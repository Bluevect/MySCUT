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
                        isDark ? Color.rgb(27, 33, 43) : Color.WHITE),
                CourseWidgetColorUtils.readColor(
                        selectedPalette,
                        "primaryTextColor",
                        isDark ? Color.rgb(228, 233, 242) : Color.rgb(31, 31, 31)),
                CourseWidgetColorUtils.readColor(
                        selectedPalette,
                        "secondaryTextColor",
                        isDark ? Color.rgb(168, 178, 197) : Color.rgb(114, 128, 154)));
    }

    static boolean followsSystemAppearance(JSONObject appearance) {
        return appearance == null || "system".equals(appearance.optString("mode", "system"));
    }

    record Palette(int backgroundColor, int primaryTextColor, int secondaryTextColor) {}
}
