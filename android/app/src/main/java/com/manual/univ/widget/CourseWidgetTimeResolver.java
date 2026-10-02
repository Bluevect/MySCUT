package com.manual.univ.widget;

import java.util.List;

final class CourseWidgetTimeResolver {
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

    private CourseWidgetTimeResolver() {}

    static String[] resolveLessonTimeParts(
            String presetId,
            int startNode,
            int endNode,
            String lessonStartTime,
            String lessonEndTime,
            List<TimeSlot> scheduleTimeSlots,
            int selectedTimeTable) {
        TimeSlot startSlot =
                findTimeSlot(presetId, startNode, scheduleTimeSlots, selectedTimeTable);
        TimeSlot endSlot = findTimeSlot(presetId, endNode, scheduleTimeSlots, selectedTimeTable);
        String startTime =
                startSlot == null || startSlot.startTime.trim().isEmpty()
                        ? lessonStartTime
                        : startSlot.startTime;
        String endTime =
                endSlot == null || endSlot.endTime.trim().isEmpty()
                        ? lessonEndTime
                        : endSlot.endTime;
        return new String[] {startTime, endTime};
    }

    static boolean isEndTimePassed(String endTime, long currentTimeMillis) {
        long endTimeMillis = parseTimeOfDayMillis(endTime);
        return endTimeMillis >= 0 && currentTimeMillis > endTimeMillis;
    }

    static long parseTimeOfDayMillis(String time) {
        if (time == null) {
            return -1;
        }

        String[] parts = time.split(":", -1);
        if (parts.length != 2) {
            return -1;
        }

        try {
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return -1;
            }

            return (hour * 60L + minute) * 60_000L;
        } catch (NumberFormatException error) {
            return -1;
        }
    }

    private static TimeSlot findTimeSlot(
            String presetId, int node, List<TimeSlot> scheduleTimeSlots, int selectedTimeTable) {
        if (node < 1) {
            return null;
        }

        if ("universityTown".equals(presetId) || "international".equals(presetId)) {
            return findPresetTimeSlot(UNIVERSITY_TOWN_TIME_SLOTS, node);
        }
        if ("wushan".equals(presetId)) {
            return findPresetTimeSlot(WUSHAN_TIME_SLOTS, node);
        }
        return findScheduleTimeSlot(scheduleTimeSlots, node, selectedTimeTable);
    }

    private static TimeSlot findScheduleTimeSlot(
            List<TimeSlot> scheduleTimeSlots, int node, int selectedTimeTable) {
        TimeSlot fallbackSlot = null;
        for (TimeSlot timeSlot : scheduleTimeSlots) {
            if (timeSlot.node != node) {
                continue;
            }
            if (timeSlot.timeTable == selectedTimeTable) {
                return timeSlot;
            }
            if (fallbackSlot == null) {
                fallbackSlot = timeSlot;
            }
        }
        return fallbackSlot;
    }

    private static TimeSlot findPresetTimeSlot(String[][] preset, int node) {
        for (String[] timeSlot : preset) {
            if (Integer.parseInt(timeSlot[0]) == node) {
                return new TimeSlot(node, timeSlot[1], timeSlot[2], Integer.MIN_VALUE);
            }
        }
        return null;
    }

    record TimeSlot(int node, String startTime, String endTime, int timeTable) {}
}
