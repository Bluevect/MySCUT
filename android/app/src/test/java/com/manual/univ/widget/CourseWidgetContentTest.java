package com.manual.univ.widget;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

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

        assertEquals("08:50-10:25", lesson.timeRangeLabel());
    }
}
