# Android 课表小组件

本文说明 Android 课表小组件的数据来源、渲染方式、刷新时机和测试方法。小组件由 Android 原生 AppWidget 实现，Web 页面不负责绘制桌面上的小组件。

## 组成

原生实现位于 `android/app/src/main/java/com/manual/univ/widget/`：

| 类 | 职责 |
| --- | --- |
| `CourseWidgetPlugin` | 暴露 Capacitor `CourseWidget` 插件方法，接收课表和外观同步请求 |
| `CourseWidgetProvider` | 接收 Android AppWidget 生命周期及日期、时间、时区和配置变化广播；处理课程结束时的定时刷新 |
| `CourseWidgetStore` | 将课表、课表主题和外观 JSON 保存在 Android `SharedPreferences` |
| `CourseWidgetRenderer` | 从本地数据组装 `RemoteViews` 并更新已放置的小组件 |
| `CourseWidgetCourseManager` | 选择当天课程、读取课程信息和颜色，并填充课程卡片 |
| `CourseWidgetTimeResolver` | 按时间表预设解析课程起止时间，并判断课程是否已结束 |
| `CourseWidgetAppearance` / `CourseWidgetColorUtils` | 解析小组件浅色、深色及用户指定的调色板 |

`MainActivity` 只注册 `CourseWidgetPlugin`。Provider 的注册、初始布局和尺寸等声明位于 `AndroidManifest.xml` 与 `res/xml/course_widget_info.xml`。

## 数据流

1. Web 层的 `src/platform/capacitor/courseWidgetSchedule.ts` 读取当前课表和对应主题，通过 Capacitor 插件发送给 Android。
2. 应用存储初始化时开始监听课表库变更，并立即同步一次；课表库变化、进入 `/courses` 页面和保存学期起始日期时也会触发同步。
3. 插件将数据写入名为 `CapacitorStorage` 的 SharedPreferences，再请求 Provider 刷新小组件。课表和外观数据都保存在设备本地，不依赖网络服务。
4. 外观同步会将当前主题模式及浅色、深色调色板一并传入；Provider 渲染时按所选模式应用调色板，系统模式则跟随资源的日夜主题。

学期起始日期随当前课表 JSON 一起同步，Android 据此计算当前周。小组件根据系统本地日期选择星期和当天课程。

## 时间表和课程显示

原生时间解析与应用时间表预设保持一致：

- `universityTown` 和 `international` 使用大学城 / 国际时间；
- `wushan` 使用五山时间；
- 其他预设（包括 `builtIn`）使用课表 `scheduleData.timeSlots`，优先匹配课表的 `timeTable`，没有匹配项时使用该节次的首个时间项；
- 如果没有可用的时间表时间，则回退到课程自身的起止时间。

当天课程先按星期、周次和单双周规则筛选，再按开始节次排序。小组件最多显示两节尚未结束的课程。课程时间精确到分钟：系统本地时间严格晚于当天的结束时刻才会隐藏该课程；在结束时刻的整分仍显示。

- 今天没有排课：隐藏课程卡片和状态文案。
- 今天有课且仍有未结束课程：显示最多两节未结束课程，不显示状态文案。
- 今天有课但全部结束：隐藏课程卡片，显示“今日课程已结束”。

## 刷新机制与限制

小组件使用 Android `RemoteViews`，初始布局为 `res/layout/course_widget_layout.xml`。`updatePeriodMillis` 设为 `0`，不依赖 Android 的周期性更新：Android 对周期更新有最短间隔限制，且可能因省电策略延后执行，无法满足课程结束时更新的需求；课表和外观变化、系统日期或配置变化以及课程结束闹钟已经覆盖了所需刷新场景。关闭周期轮询可以避免内容未变化时反复重绘和耗电。

刷新由以下事件触发：

- Capacitor 插件同步课表或外观；
- Android 创建或更新小组件；
- 日期、系统时间、时区或系统配置变化；
- Provider 用 `AlarmManager.setAndAllowWhileIdle()` 为当天下一节课的结束时间安排一次广播刷新。

课程结束刷新使用非精确的 RTC 闹钟。Android 省电策略可能延迟广播，因此它不是准点提醒，也不保证在结束时间的精确瞬间刷新。系统重启后 AlarmManager 定时任务不会保留；小组件之后再次被系统或应用刷新时会重新安排下一次课程结束刷新。

## 原生测试

时间解析与结束时间判断由不依赖 Android UI 的 JVM 单元测试覆盖：

```powershell
Set-Location android
.\gradlew.bat :app:testDebugUnitTest
```

测试位于 `android/app/src/test/java/com/manual/univ/widget/CourseWidgetTimeResolverTest.java`，覆盖各时间表预设、缺失时间回退以及课程结束时间边界。
