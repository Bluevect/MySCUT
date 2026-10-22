package com.manual.univ.widget;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.Calendar;
import java.util.GregorianCalendar;

public class CourseWidgetContentTest {
    @Test
    public void blankLessonHasNoTimeSeparator() {
        CourseWidgetContent.Lesson lesson =
                new CourseWidgetContent.Lesson("", "", "", "", 0);

        assertEquals("", lesson.timeRangeLabel());
    }

    @Test
    public void lessonTimeRangeUsesSeparator() {
        CourseWidgetContent.Lesson lesson =
                new CourseWidgetContent.Lesson("Course", "Room", "08:50", "10:25", 0);

        assertEquals("08:50–10:25", lesson.timeRangeLabel());
    }

    @Test
    public void weekdayNumberMatchesScheduleDayNumbers() {
        assertEquals(1, CourseWidgetCourseManager.weekdayNumber(date(2026, Calendar.OCTOBER, 19)));
        assertEquals(5, CourseWidgetCourseManager.weekdayNumber(date(2026, Calendar.OCTOBER, 23)));
        assertEquals(6, CourseWidgetCourseManager.weekdayNumber(date(2026, Calendar.OCTOBER, 24)));
        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(date(2026, Calendar.OCTOBER, 18)));
    }

    @Test
    public void tomorrowRollsFromSundayToMonday() {
        Calendar sunday = date(2026, Calendar.OCTOBER, 18);
        Calendar monday = (Calendar) sunday.clone();
        monday.add(Calendar.DAY_OF_MONTH, 1);

        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(sunday));
        assertEquals(1, CourseWidgetCourseManager.weekdayNumber(monday));
    }

    @Test
    public void tomorrowRollsOverMonthEnd() {
        Calendar saturday = date(2026, Calendar.OCTOBER, 31);
        Calendar sunday = (Calendar) saturday.clone();
        sunday.add(Calendar.DAY_OF_MONTH, 1);

        assertEquals(Calendar.NOVEMBER, sunday.get(Calendar.MONTH));
        assertEquals(1, sunday.get(Calendar.DAY_OF_MONTH));
        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(sunday));
    }

    private static Calendar date(int year, int month, int day) {
        Calendar calendar = new GregorianCalendar(year, month, day);
        calendar.clear(Calendar.HOUR_OF_DAY);
        calendar.clear(Calendar.MINUTE);
        calendar.clear(Calendar.SECOND);
        calendar.clear(Calendar.MILLISECOND);
        return calendar;
    }
}
