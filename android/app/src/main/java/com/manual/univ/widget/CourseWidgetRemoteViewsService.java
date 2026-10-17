package com.manual.univ.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

// Supplies the scrollable lesson rows for every course widget style.
public class CourseWidgetRemoteViewsService extends RemoteViewsService {
    static final String EXTRA_LESSON_STYLE = "lesson_style";

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new CourseWidgetListFactory(
                getApplicationContext(),
                intent.getStringExtra(EXTRA_LESSON_STYLE));
    }
}
