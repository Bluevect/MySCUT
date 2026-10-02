package com.manual.univ;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.manual.univ.widget.CourseWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        registerPlugin(CourseWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
