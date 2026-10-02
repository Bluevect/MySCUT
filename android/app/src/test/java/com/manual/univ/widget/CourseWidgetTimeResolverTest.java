package com.manual.univ.widget;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class CourseWidgetTimeResolverTest {
    @Test
    public void universityTownPresetUsesPresetTimesInsteadOfLessonTimes() {
        assertResolvedTimes(
                "universityTown",
                1,
                2,
                "00:00",
                "00:00",
                Collections.emptyList(),
                0,
                "08:50",
                "10:25");
    }

    @Test
    public void internationalPresetUsesUniversityTownTimes() {
        assertResolvedTimes(
                "international", 1, 1, "", "", Collections.emptyList(), 0, "08:50", "09:35");
    }

    @Test
    public void wushanPresetUsesWushanTimes() {
        assertResolvedTimes(
                "wushan", 1, 2, "00:00", "00:00", Collections.emptyList(), 0, "08:00", "09:40");
    }

    @Test
    public void builtInPresetUsesSlotsForSelectedTimetable() {
        List<CourseWidgetTimeResolver.TimeSlot> slots =
                Arrays.asList(
                        new CourseWidgetTimeResolver.TimeSlot(1, "07:00", "07:45", 1),
                        new CourseWidgetTimeResolver.TimeSlot(1, "09:00", "09:45", 2),
                        new CourseWidgetTimeResolver.TimeSlot(2, "10:00", "10:45", 2));

        assertResolvedTimes("builtIn", 1, 2, "", "", slots, 2, "09:00", "10:45");
    }

    @Test
    public void builtInPresetFallsBackToFirstSlotWhenSelectedTimetableIsMissing() {
        List<CourseWidgetTimeResolver.TimeSlot> slots =
                Arrays.asList(
                        new CourseWidgetTimeResolver.TimeSlot(1, "07:00", "07:45", 1),
                        new CourseWidgetTimeResolver.TimeSlot(1, "09:00", "09:45", 2));

        assertResolvedTimes("builtIn", 1, 1, "", "", slots, 3, "07:00", "07:45");
    }

    @Test
    public void missingPresetNodeFallsBackToLessonTimes() {
        assertResolvedTimes(
                "wushan", 12, 12, "07:30", "08:15", Collections.emptyList(), 0, "07:30", "08:15");
    }

    @Test
    public void missingScheduleSlotFallsBackToLessonTimes() {
        assertResolvedTimes(
                "builtIn", 1, 1, "07:30", "08:15", Collections.emptyList(), 0, "07:30",                 "08:15");
    }

    @Test
    public void lessonIsFinishedAfterItsEndTime() {
        assertTrue(CourseWidgetTimeResolver.isEndTimePassed("09:35", 9 * 3_600_000L + 36 * 60_000L));
    }

    @Test
    public void lessonIsNotFinishedAtItsEndTime() {
        assertFalse(CourseWidgetTimeResolver.isEndTimePassed("09:35", 9 * 3_600_000L + 35 * 60_000L));
    }

    @Test
    public void lessonIsFinishedOneSecondAfterItsEndTime() {
        assertTrue(
                CourseWidgetTimeResolver.isEndTimePassed(
                        "09:35", 9 * 3_600_000L + 35 * 60_000L + 1_000L));
    }

    @Test
    public void invalidEndTimeIsNotTreatedAsFinished() {
        assertFalse(CourseWidgetTimeResolver.isEndTimePassed("not-a-time", 24 * 3_600_000L));
    }

    private static void assertResolvedTimes(
            String presetId,
            int startNode,
            int endNode,
            String lessonStartTime,
            String lessonEndTime,
            List<CourseWidgetTimeResolver.TimeSlot> scheduleTimeSlots,
            int selectedTimeTable,
            String expectedStartTime,
            String expectedEndTime) {
        assertArrayEquals(
                new String[] {expectedStartTime, expectedEndTime},
                CourseWidgetTimeResolver.resolveLessonTimeParts(
                        presetId,
                        startNode,
                        endNode,
                        lessonStartTime,
                        lessonEndTime,
                        scheduleTimeSlots,
                        selectedTimeTable));
    }
}
