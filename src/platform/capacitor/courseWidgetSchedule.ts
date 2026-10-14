import { Capacitor, registerPlugin } from '@capacitor/core'
import { getGlobalThemePreset } from '../../core/theme/globalThemePresets'
import type { GlobalThemeFamily, GlobalThemeMode } from '../../core/theme/types'
import {
  loadActiveScheduleEntry,
  subscribeScheduleLibraryChanges,
} from '../../core/schedule/storage'
import { getScheduleThemePresetById } from '../../core/schedule/themePresets'
import { getCourseWidgetShowsRemaining } from '../../core/schedule/displaySettings'

export type AndroidCourseWidgetStatus = {
  hasWidget: boolean
  canScheduleExactAlarms: boolean
}

type CourseWidgetPlugin = {
  syncSchedule(options: { scheduleJson: string; scheduleThemeJson: string }): Promise<void>
  refresh(options?: { appearanceJson?: string }): Promise<void>
  getWidgetStatus(): Promise<AndroidCourseWidgetStatus>
  requestExactAlarmPermission(): Promise<{ opened: boolean }>
}

const CourseWidget = registerPlugin<CourseWidgetPlugin>('CourseWidget')
let syncQueue = Promise.resolve()

export function supportsAndroidCourseWidget() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

// A failed status read must not block widget syncing.
export async function loadAndroidCourseWidgetStatus(): Promise<AndroidCourseWidgetStatus | null> {
  if (!supportsAndroidCourseWidget()) {
    return null
  }

  try {
    return await CourseWidget.getWidgetStatus()
  } catch (error) {
    console.error('Failed to read Android course widget status:', error)
    return null
  }
}

export async function requestAndroidExactAlarmPermission() {
  if (!supportsAndroidCourseWidget()) {
    return
  }

  try {
    await CourseWidget.requestExactAlarmPermission()
  } catch (error) {
    console.error('Failed to open Android exact alarm settings:', error)
  }
}

// Only relevant once the widget is placed, so users without one are never asked.
export function shouldPromptExactAlarmPermission(status: AndroidCourseWidgetStatus | null) {
  return status !== null && status.hasWidget && !status.canScheduleExactAlarms
}

function enqueueWidgetSync(operation: () => Promise<void>) {
  syncQueue = syncQueue.then(operation).catch((error: unknown) => {
    console.error('Failed to sync Android course widget:', error)
  })
}

export function syncAndroidCourseWidgetSchedule(semesterStartDate?: string) {
  if (!supportsAndroidCourseWidget()) {
    return
  }

  enqueueWidgetSync(async () => {
    const activeSchedule = loadActiveScheduleEntry()
    const scheduleTheme = getScheduleThemePresetById(activeSchedule?.themeId ?? '')
    const scheduleForWidget = activeSchedule
      ? {
          ...activeSchedule,
          semesterStartDate: semesterStartDate ?? activeSchedule.semesterStartDate,
        }
      : null
    await CourseWidget.syncSchedule({
      scheduleJson: JSON.stringify(scheduleForWidget),
      scheduleThemeJson: JSON.stringify(scheduleTheme),
    })
  })
}

export function startAndroidCourseWidgetScheduleSync() {
  if (!supportsAndroidCourseWidget()) {
    return
  }

  const syncActiveSchedule = () => syncAndroidCourseWidgetSchedule()

  const unsubscribe = subscribeScheduleLibraryChanges(syncActiveSchedule)
  syncActiveSchedule()

  return unsubscribe
}

export function syncAndroidCourseWidgetAppearance(
  mode: GlobalThemeMode,
  family: GlobalThemeFamily,
) {
  if (!supportsAndroidCourseWidget()) {
    return
  }

  const toWidgetPalette = (resolvedMode: 'light' | 'dark') => {
    const variables = getGlobalThemePreset(resolvedMode, family).cssVariables
    return {
      // The widget reads as a soft surface, so it takes the alt surface token.
      backgroundColor: variables['--bg-surface-alt'],
      primaryTextColor: variables['--text-primary'],
      secondaryTextColor: variables['--text-secondary'],
    }
  }

  const appearanceJson = JSON.stringify({
    mode,
    showRemaining: getCourseWidgetShowsRemaining(),
    light: toWidgetPalette('light'),
    dark: toWidgetPalette('dark'),
  })

  enqueueWidgetSync(() => CourseWidget.refresh({ appearanceJson }))
}
