import { Capacitor, registerPlugin } from '@capacitor/core'
import { getGlobalThemePreset } from '../../core/theme/globalThemePresets'
import type { GlobalThemeFamily, GlobalThemeMode } from '../../core/theme/types'
import {
  loadActiveScheduleEntry,
  subscribeScheduleLibraryChanges,
} from '../../core/schedule/storage'
import { getSemesterStartDate } from '../../core/scheduleSettings'
import { getScheduleThemePresetById } from '../../core/schedule/themePresets'

type CourseWidgetPlugin = {
  syncSchedule(options: { scheduleJson: string; scheduleThemeJson: string }): Promise<void>
  refresh(options?: { appearanceJson?: string }): Promise<void>
}

const CourseWidget = registerPlugin<CourseWidgetPlugin>('CourseWidget')
let syncQueue = Promise.resolve()

function enqueueWidgetSync(operation: () => Promise<void>) {
  syncQueue = syncQueue.then(operation).catch((error: unknown) => {
    console.error('Failed to sync Android course widget:', error)
  })
}

export function syncAndroidCourseWidgetSchedule(semesterStartDate?: string) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  enqueueWidgetSync(async () => {
    const activeSchedule = loadActiveScheduleEntry()
    const scheduleTheme = getScheduleThemePresetById(activeSchedule?.themeId ?? '')
    const scheduleForWidget = activeSchedule
      ? { ...activeSchedule, semesterStartDate: semesterStartDate ?? getSemesterStartDate() }
      : null
    await CourseWidget.syncSchedule({
      scheduleJson: JSON.stringify(scheduleForWidget),
      scheduleThemeJson: JSON.stringify(scheduleTheme),
    })
  })
}

export function startAndroidCourseWidgetScheduleSync() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  const syncActiveSchedule = () => syncAndroidCourseWidgetSchedule()

  const unsubscribe = subscribeScheduleLibraryChanges(syncActiveSchedule)
  syncActiveSchedule()

  return unsubscribe
}

export function syncAndroidCourseWidgetAppearance(mode: GlobalThemeMode, family: GlobalThemeFamily) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  const toWidgetPalette = (resolvedMode: 'light' | 'dark') => {
    const variables = getGlobalThemePreset(resolvedMode, family).cssVariables
    return {
      backgroundColor: variables['--bg-surface'],
      primaryTextColor: variables['--text-primary'],
      secondaryTextColor: variables['--text-secondary'],
    }
  }

  const appearanceJson = JSON.stringify({
    mode,
    light: toWidgetPalette('light'),
    dark: toWidgetPalette('dark'),
  })

  enqueueWidgetSync(() => CourseWidget.refresh({ appearanceJson }))
}
