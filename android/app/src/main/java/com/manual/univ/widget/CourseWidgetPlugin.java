package com.manual.univ.widget;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
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
        CourseWidgetRefresh.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        String appearanceJson = call.getString("appearanceJson");
        if (appearanceJson != null && !appearanceJson.isEmpty()) {
            CourseWidgetStore.saveAppearance(getContext(), appearanceJson);
        }

        CourseWidgetRefresh.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getWidgetStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
                "hasWidget",
                BarWidgetProvider.hasPlacedWidget(getContext())
                        || CardWidgetProvider.hasPlacedWidget(getContext()));
        result.put(
                "canScheduleExactAlarms",
                CourseWidgetRefresh.canScheduleExactAlarms(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                || CourseWidgetRefresh.canScheduleExactAlarms(getContext())) {
            result.put("opened", false);
            call.resolve(result);
            return;
        }

        Intent intent =
                new Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (RuntimeException error) {
            call.reject("Failed to open the exact alarm permission settings", error);
            return;
        }

        result.put("opened", true);
        call.resolve(result);
    }
}
