package com.manual.univ.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.widget.RemoteViews;

import com.manual.univ.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

final class CourseWidgetCourseManager {
    private static final long DAY_IN_MILLIS = 24L * 60L * 60L * 1000L;
    private static final String[][] UNIVERSITY_TOWN_TIME_SLOTS = {
        {"1", "08:50", "09:35"},
        {"2", "09:40", "10:25"},
        {"3", "10:40", "11:25"},
        {"4", "11:30", "12:15"},
        {"5", "14:00", "14:45"},
        {"6", "14:50", "15:35"},
        {"7", "15:45", "16:30"},
        {"8", "16:35", "17:20"},
        {"9", "19:00", "19:45"},
        {"10", "19:55", "20:40"},
        {"11", "20:50", "21:35"},
    };
    private static final String[][] WUSHAN_TIME_SLOTS = {
        {"1", "08:00", "08:45"},
        {"2", "08:55", "09:40"},
        {"3", "10:00", "10:45"},
        {"4", "10:55", "11:40"},
        {"5", "14:30", "15:15"},
        {"6", "15:25", "16:10"},
        {"7", "16:20", "17:05"},
        {"8", "17:15", "18:00"},
        {"9", "19:00", "19:45"},
        {"10", "19:55", "20:40"},
        {"11", "20:50", "21:35"},
    };
    private static final float CORNER_RADIUS_PX = 24.0f;

    private CourseWidgetCourseManager() {}

    static JSONObject getScheduleData(JSONObject schedule) {
        return schedule == null ? null : schedule.optJSONObject("scheduleData");
    }

    static String getTimeSlotPresetId(JSONObject schedule) {
        return schedule == null ? "builtIn" : schedule.optString("timeSlotPresetId", "builtIn");
    }

    static String getScheduleName(JSONObject schedule) {
        return schedule == null ? "我的课表" : schedule.optString("name", "我的课表");
    }

    static int getCurrentWeek(JSONObject schedule) {
        if (schedule == null) {
            return 1;
        }

        JSONObject scheduleData = getScheduleData(schedule);
        JSONObject table = scheduleData == null ? null : scheduleData.optJSONObject("table");
        String startDateText = schedule.optString("semesterStartDate", "");
        if (startDateText.isEmpty() && table != null) {
            startDateText = table.optString("startDate", "");
        }

        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
        formatter.setLenient(false);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        try {
            Date semesterStart = formatter.parse(startDateText);
            if (semesterStart == null) {
                return 1;
            }

            Calendar localToday = Calendar.getInstance();
            Calendar utcToday = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            utcToday.clear();
            utcToday.set(
                    localToday.get(Calendar.YEAR),
                    localToday.get(Calendar.MONTH),
                    localToday.get(Calendar.DAY_OF_MONTH));
            long differenceDays =
                    Math.floorDiv(
                            utcToday.getTimeInMillis() - semesterStart.getTime(), DAY_IN_MILLIS);
            return Math.max(1, (int) Math.floorDiv(differenceDays, 7L) + 1);
        } catch (ParseException error) {
            return 1;
        }
    }

    static List<JSONObject> getTodayLessons(JSONObject scheduleData, int weekday, int currentWeek) {
        List<JSONObject> lessonsForToday = new ArrayList<>();
        if (scheduleData == null) {
            return lessonsForToday;
        }

        JSONArray lessons = scheduleData.optJSONArray("lessons");
        if (lessons == null) {
            return lessonsForToday;
        }

        for (int index = 0; index < lessons.length(); index++) {
            JSONObject lesson = lessons.optJSONObject(index);
            if (lesson == null || lesson.optInt("day") != weekday) {
                continue;
            }

            int startWeek = lesson.optInt("startWeek", 1);
            int endWeek = lesson.optInt("endWeek", startWeek);
            int weekStep = Math.max(1, lesson.optInt("weekStep", 1));
            if (currentWeek >= startWeek
                    && currentWeek <= endWeek
                    && (currentWeek - startWeek) % weekStep == 0) {
                lessonsForToday.add(lesson);
            }
        }

        lessonsForToday.sort(Comparator.comparingInt(lesson -> lesson.optInt("startNode")));
        return lessonsForToday;
    }

    static void applyCourse(
            RemoteViews views,
            JSONObject scheduleData,
            JSONObject scheduleTheme,
            String timeSlotPresetId,
            JSONObject lesson,
            int weekday,
            int slot) {
        int nameViewId = slot == 1 ? R.id.course_1_name : R.id.course_2_name;
        int placeViewId = slot == 1 ? R.id.course_1_place : R.id.course_2_place;
        int startTimeViewId = slot == 1 ? R.id.course_1_start_time : R.id.course_2_start_time;
        int endTimeViewId = slot == 1 ? R.id.course_1_end_time : R.id.course_2_end_time;
        int backgroundViewId = slot == 1 ? R.id.course_1_bg : R.id.course_2_bg;
        int courseCardViewId = slot == 1 ? R.id.course_1_card : R.id.course_2_card;

        JSONObject course =
                findCourse(scheduleData.optJSONArray("courses"), lesson.optInt("courseId"));
        String courseName = course == null ? "课程" : course.optString("name", "课程");
        String place = lesson.optString("room", "");
        String[] timeParts = resolveLessonTimeParts(scheduleData, timeSlotPresetId, lesson);

        String courseColor = course == null ? "" : course.optString("color", "");
        int fallbackColor =
                getFallbackCourseColor(
                        scheduleTheme,
                        lesson.optInt("courseId"),
                        weekday,
                        lesson.optInt("startNode"));
        int backgroundColor = CourseWidgetColorUtils.parseColor(courseColor, fallbackColor);
        int primaryTextColor =
                CourseWidgetColorUtils.readColor(
                        scheduleTheme, "textColorPrimary", Color.rgb(31, 42, 60));
        int secondaryTextColor =
                CourseWidgetColorUtils.readColor(
                        scheduleTheme, "textColorSecondary", Color.rgb(58, 94, 124));

        views.setTextViewText(nameViewId, courseName);
        views.setTextViewText(placeViewId, place);
        views.setTextViewText(startTimeViewId, timeParts[0]);
        views.setTextViewText(endTimeViewId, timeParts[1]);
        views.setTextColor(nameViewId, primaryTextColor);
        views.setTextColor(placeViewId, secondaryTextColor);
        views.setTextColor(startTimeViewId, secondaryTextColor);
        views.setTextColor(endTimeViewId, secondaryTextColor);
        views.setImageViewBitmap(backgroundViewId, createRoundedRectBitmap(backgroundColor));
        views.setViewVisibility(courseCardViewId, android.view.View.VISIBLE);
    }

    private static String[] resolveLessonTimeParts(
            JSONObject scheduleData, String presetId, JSONObject lesson) {
        LessonTimeSlot startSlot = findTimeSlot(scheduleData, presetId, lesson.optInt("startNode"));
        LessonTimeSlot endSlot = findTimeSlot(scheduleData, presetId, lesson.optInt("endNode"));
        String startTime =
                startSlot == null || startSlot.startTime.trim().isEmpty()
                        ? lesson.optString("startTime", "")
                        : startSlot.startTime;
        String endTime =
                endSlot == null || endSlot.endTime.trim().isEmpty()
                        ? lesson.optString("endTime", "")
                        : endSlot.endTime;
        return new String[] {startTime, endTime};
    }

    private static LessonTimeSlot findTimeSlot(JSONObject scheduleData, String presetId, int node) {
        if (scheduleData == null || node < 1) {
            return null;
        }

        if ("universityTown".equals(presetId) || "international".equals(presetId)) {
            return findPresetTimeSlot(UNIVERSITY_TOWN_TIME_SLOTS, node);
        }
        if ("wushan".equals(presetId)) {
            return findPresetTimeSlot(WUSHAN_TIME_SLOTS, node);
        }
        return findScheduleTimeSlot(scheduleData, node);
    }

    private static LessonTimeSlot findScheduleTimeSlot(JSONObject scheduleData, int node) {
        JSONArray timeSlots = scheduleData.optJSONArray("timeSlots");
        if (timeSlots == null) {
            return null;
        }

        JSONObject table = scheduleData.optJSONObject("table");
        int selectedTimeTable =
                table == null ? Integer.MIN_VALUE : table.optInt("timeTable", Integer.MIN_VALUE);
        LessonTimeSlot fallbackSlot = null;
        for (int index = 0; index < timeSlots.length(); index++) {
            JSONObject timeSlot = timeSlots.optJSONObject(index);
            if (timeSlot == null || timeSlot.optInt("node") != node) {
                continue;
            }
            LessonTimeSlot resolvedSlot =
                    new LessonTimeSlot(
                            timeSlot.optString("startTime", ""), timeSlot.optString("endTime", ""));
            if (timeSlot.optInt("timeTable", Integer.MIN_VALUE) == selectedTimeTable) {
                return resolvedSlot;
            }
            if (fallbackSlot == null) {
                fallbackSlot = resolvedSlot;
            }
        }
        return fallbackSlot;
    }

    private static LessonTimeSlot findPresetTimeSlot(String[][] preset, int node) {
        for (String[] timeSlot : preset) {
            if (Integer.parseInt(timeSlot[0]) == node) {
                return new LessonTimeSlot(timeSlot[1], timeSlot[2]);
            }
        }
        return null;
    }

    private static JSONObject findCourse(JSONArray courses, int courseId) {
        if (courses == null) {
            return null;
        }

        for (int index = 0; index < courses.length(); index++) {
            JSONObject course = courses.optJSONObject(index);
            if (course != null && course.optInt("id") == courseId) {
                return course;
            }
        }
        return null;
    }

    private static int getFallbackCourseColor(
            JSONObject scheduleTheme, int courseId, int weekday, int lessonNumber) {
        JSONArray fallbackColors =
                scheduleTheme == null ? null : scheduleTheme.optJSONArray("fallbackColors");
        if (fallbackColors == null || fallbackColors.length() == 0) {
            return Color.rgb(217, 232, 255);
        }

        String color =
                fallbackColors.optString(
                        Math.floorMod(courseId + weekday + lessonNumber, fallbackColors.length()));
        return CourseWidgetColorUtils.parseColor(color, Color.rgb(217, 232, 255));
    }

    private static Bitmap createRoundedRectBitmap(int color) {
        int width = 800;
        int height = 200;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        canvas.drawRoundRect(0f, 0f, width, height, CORNER_RADIUS_PX, CORNER_RADIUS_PX, paint);
        return bitmap;
    }

    private record LessonTimeSlot(String startTime, String endTime) {}
}
