package com.manual.univ.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CourseWidget")
public class CourseWidgetPlugin extends Plugin {
    @PluginMethod
    public void syncSchedule(PluginCall call) {
        String scheduleJson = call.getString("scheduleJson");
        String scheduleThemeJson = call.getString("scheduleThemeJson");
        if (scheduleJson == null || scheduleThemeJson == null) {
            call.reject("scheduleJson and scheduleThemeJson are required");
            return;
        }

        CourseWidgetStore.saveSchedule(getContext(), scheduleJson, scheduleThemeJson);
        CourseWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        String appearanceJson = call.getString("appearanceJson");
        if (appearanceJson != null && !appearanceJson.isEmpty()) {
            CourseWidgetStore.saveAppearance(getContext(), appearanceJson);
        }

        CourseWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
