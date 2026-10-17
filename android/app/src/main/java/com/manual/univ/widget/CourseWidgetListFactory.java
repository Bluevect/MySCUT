package com.manual.univ.widget;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.manual.univ.R;

import java.util.List;
import java.util.Locale;

final class CourseWidgetListFactory implements RemoteViewsService.RemoteViewsFactory {
    private static final int BAR_ACCENT_WIDTH_DP = 4;
    private static final int COMPACT_ACCENT_HEIGHT_DP = 44;
    private static final int CARD_ACCENT_HEIGHT_DP = 48;
    private static final int CARD_ACCENT_WIDTH_DP = 240;
    private static final float CARD_ACCENT_RADIUS_DP = 8.0f;

    private final Context context;
    private final CourseWidgetRemoteViews.LessonStyle style;

    private CourseWidgetContent.Snapshot content;
    private CourseWidgetRemoteViews.LessonTextColors textColors;

    CourseWidgetListFactory(Context context, String styleName) {
        this.context = context;
        this.style = resolveStyle(styleName);
        reload();
    }

    static int resolveItemLayout(CourseWidgetRemoteViews.LessonStyle style) {
        return switch (style) {
            case CARD -> R.layout.course_widget_list_item_card;
            case COMPACT_CARD -> R.layout.compact_course_widget_list_item_card;
            case COMPACT_BAR -> R.layout.compact_course_widget_list_item_bar;
            case BAR -> R.layout.course_widget_list_item_bar;
        };
    }

    private static CourseWidgetRemoteViews.LessonStyle resolveStyle(String styleName) {
        if (styleName == null || styleName.trim().isEmpty()) {
            return CourseWidgetRemoteViews.LessonStyle.BAR;
        }

        try {
            return CourseWidgetRemoteViews.LessonStyle.valueOf(
                    styleName.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return CourseWidgetRemoteViews.LessonStyle.BAR;
        }
    }

    private void reload() {
        CourseWidgetStore.WidgetData data = CourseWidgetStore.load(context);
        content = CourseWidgetContent.resolve(data);
        CourseWidgetAppearance.Palette palette =
                CourseWidgetAppearance.resolvePalette(context, data.appearance());
        textColors = resolveTextColors(style, content, palette);
    }

    static CourseWidgetRemoteViews.LessonTextColors resolveTextColors(
            CourseWidgetRemoteViews.LessonStyle style,
            CourseWidgetContent.Snapshot content,
            CourseWidgetAppearance.Palette palette) {
        return style.isCard()
                ? new CourseWidgetRemoteViews.LessonTextColors(
                        content.primaryTextColor(), content.secondaryTextColor())
                : new CourseWidgetRemoteViews.LessonTextColors(
                        palette.primaryTextColor(), palette.secondaryTextColor());
    }

    @Override
    public void onCreate() {
        reload();
    }

    @Override
    public void onDataSetChanged() {
        reload();
    }

    @Override
    public void onDestroy() {}

    @Override
    public int getCount() {
        return content == null ? 0 : content.lessons().size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        List<CourseWidgetContent.Lesson> lessons = content == null ? null : content.lessons();
        if (lessons == null || position < 0 || position >= lessons.size()) {
            return null;
        }

        CourseWidgetContent.Lesson lesson = lessons.get(position);
        return createItemView(context, style, lesson, textColors);
    }

    static RemoteViews createItemView(
            Context context,
            CourseWidgetRemoteViews.LessonStyle style,
            CourseWidgetContent.Lesson lesson,
            CourseWidgetRemoteViews.LessonTextColors textColors) {
        RemoteViews views =
                new RemoteViews(context.getPackageName(), resolveItemLayout(style));
        views.setTextViewText(R.id.course_item_name, lesson.name());
        views.setTextViewText(R.id.course_item_place, lesson.place());
        views.setTextColor(R.id.course_item_name, textColors.primary());
        views.setTextColor(R.id.course_item_place, textColors.secondary());
        bindTime(views, style, lesson, textColors);

        boolean cardStyle = style.isCard();
        int accentHeight =
                !style.isCompact() && cardStyle
                        ? CARD_ACCENT_HEIGHT_DP
                        : COMPACT_ACCENT_HEIGHT_DP;
        views.setImageViewBitmap(
                R.id.course_item_accent,
                CourseWidgetRemoteViews.createRoundedBitmap(
                        context,
                        cardStyle ? CARD_ACCENT_WIDTH_DP : BAR_ACCENT_WIDTH_DP,
                        accentHeight,
                        cardStyle ? CARD_ACCENT_RADIUS_DP : BAR_ACCENT_WIDTH_DP / 2.0f,
                        lesson.accentColor()));
        views.setOnClickFillInIntent(R.id.course_widget_list_item, new Intent());
        return views;
    }

    private static void bindTime(
            RemoteViews views,
            CourseWidgetRemoteViews.LessonStyle style,
            CourseWidgetContent.Lesson lesson,
            CourseWidgetRemoteViews.LessonTextColors textColors) {
        if (style.isCompact()) {
            views.setTextViewText(R.id.course_item_time, lesson.timeRangeLabel());
            views.setTextColor(R.id.course_item_time, textColors.secondary());
            return;
        }

        views.setTextViewText(R.id.course_item_start_time, lesson.startTime());
        views.setTextViewText(R.id.course_item_end_time, lesson.endTime());
        views.setTextColor(R.id.course_item_start_time, textColors.secondary());
        views.setTextColor(R.id.course_item_end_time, textColors.secondary());
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }
}
