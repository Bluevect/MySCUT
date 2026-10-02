package com.manual.univ.widget;

import android.graphics.Color;

import org.json.JSONObject;

import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class CourseWidgetColorUtils {
    private static final Pattern RGBA_PATTERN =
            Pattern.compile(
                    "rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)(?:\\s*,\\s*([0-9.]+))?\\s*\\)",
                    Pattern.CASE_INSENSITIVE);

    private CourseWidgetColorUtils() {}

    static int readColor(JSONObject source, String key, int fallbackColor) {
        return source == null
                ? fallbackColor
                : parseColor(source.optString(key, ""), fallbackColor);
    }

    static int parseColor(String value, int fallbackColor) {
        if (value == null || value.trim().isEmpty()) {
            return fallbackColor;
        }

        String normalized = value.trim();
        Matcher rgbaMatcher = RGBA_PATTERN.matcher(normalized);
        if (rgbaMatcher.matches()) {
            int alpha =
                    rgbaMatcher.group(4) == null
                            ? 255
                            : Math.round(
                                    Float.parseFloat(Objects.requireNonNull(rgbaMatcher.group(4)))
                                            * 255f);
            return Color.argb(
                    Math.clamp(alpha, 0, 255),
                    Integer.parseInt(Objects.requireNonNull(rgbaMatcher.group(1))),
                    Integer.parseInt(Objects.requireNonNull(rgbaMatcher.group(2))),
                    Integer.parseInt(Objects.requireNonNull(rgbaMatcher.group(3))));
        }

        try {
            return Color.parseColor(normalized);
        } catch (IllegalArgumentException error) {
            return fallbackColor;
        }
    }
}
