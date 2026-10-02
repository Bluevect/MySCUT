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

    static String getLessonEndTime(
            JSONObject scheduleData, String timeSlotPresetId, JSONObject lesson) {
        return resolveLessonTimeParts(scheduleData, timeSlotPresetId, lesson)[1];
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
        JSONArray timeSlots = scheduleData == null ? null : scheduleData.optJSONArray("timeSlots");
        JSONObject table = scheduleData == null ? null : scheduleData.optJSONObject("table");
        int selectedTimeTable =
                table == null ? Integer.MIN_VALUE : table.optInt("timeTable", Integer.MIN_VALUE);
        List<CourseWidgetTimeResolver.TimeSlot> scheduleTimeSlots = new ArrayList<>();
        if (timeSlots != null) {
            for (int index = 0; index < timeSlots.length(); index++) {
                JSONObject timeSlot = timeSlots.optJSONObject(index);
                if (timeSlot != null) {
                    scheduleTimeSlots.add(
                            new CourseWidgetTimeResolver.TimeSlot(
                                    timeSlot.optInt("node"),
                                    timeSlot.optString("startTime", ""),
                                    timeSlot.optString("endTime", ""),
                                    timeSlot.optInt("timeTable", Integer.MIN_VALUE)));
                }
            }
        }
        return CourseWidgetTimeResolver.resolveLessonTimeParts(
                presetId,
                lesson.optInt("startNode"),
                lesson.optInt("endNode"),
                lesson.optString("startTime", ""),
                lesson.optString("endTime", ""),
                scheduleTimeSlots,
                selectedTimeTable);
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
}
