import { beforeEach, describe, expect, it, vi } from 'vitest'

const pluginMocks = vi.hoisted(() => ({
  getWidgetStatus: vi.fn(),
  refresh: vi.fn(),
  requestExactAlarmPermission: vi.fn(),
  syncSchedule: vi.fn(),
}))

const capacitorMocks = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  isNativePlatform: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: capacitorMocks.getPlatform,
    isNativePlatform: capacitorMocks.isNativePlatform,
  },
  registerPlugin: () => pluginMocks,
}))

import {
  loadAndroidCourseWidgetStatus,
  requestAndroidExactAlarmPermission,
  shouldPromptExactAlarmPermission,
  supportsAndroidCourseWidget,
} from '../../../src/platform/capacitor/courseWidgetSchedule'

describe('android course widget exact alarm permission', () => {
  beforeEach(() => {
    capacitorMocks.isNativePlatform.mockReset().mockReturnValue(true)
    capacitorMocks.getPlatform.mockReset().mockReturnValue('android')
    pluginMocks.getWidgetStatus.mockReset().mockResolvedValue({
      hasWidget: true,
      canScheduleExactAlarms: false,
    })
    pluginMocks.requestExactAlarmPermission.mockReset().mockResolvedValue({ opened: true })
  })

  it('prompts only when a widget is placed without the exact alarm permission', () => {
    expect(
      shouldPromptExactAlarmPermission({ hasWidget: true, canScheduleExactAlarms: false }),
    ).toBe(true)
    expect(
      shouldPromptExactAlarmPermission({ hasWidget: true, canScheduleExactAlarms: true }),
    ).toBe(false)
    expect(
      shouldPromptExactAlarmPermission({ hasWidget: false, canScheduleExactAlarms: false }),
    ).toBe(false)
    expect(shouldPromptExactAlarmPermission(null)).toBe(false)
  })

  it('targets the plugin only on android', async () => {
    expect(supportsAndroidCourseWidget()).toBe(true)

    capacitorMocks.getPlatform.mockReturnValue('ios')
    expect(supportsAndroidCourseWidget()).toBe(false)
    await expect(loadAndroidCourseWidgetStatus()).resolves.toBeNull()
    await requestAndroidExactAlarmPermission()
    expect(pluginMocks.getWidgetStatus).not.toHaveBeenCalled()
    expect(pluginMocks.requestExactAlarmPermission).not.toHaveBeenCalled()

    capacitorMocks.isNativePlatform.mockReturnValue(false)
    capacitorMocks.getPlatform.mockReturnValue('android')
    expect(supportsAndroidCourseWidget()).toBe(false)
  })

  it('reads the widget status from the plugin on android', async () => {
    await expect(loadAndroidCourseWidgetStatus()).resolves.toEqual({
      hasWidget: true,
      canScheduleExactAlarms: false,
    })
    expect(pluginMocks.getWidgetStatus).toHaveBeenCalledOnce()
  })

  it('treats a failing status read as unknown instead of blocking the caller', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    pluginMocks.getWidgetStatus.mockRejectedValue(new Error('plugin unavailable'))

    await expect(loadAndroidCourseWidgetStatus()).resolves.toBeNull()
    expect(consoleError).toHaveBeenCalled()
  })

  it('opens the exact alarm settings without failing the caller', async () => {
    await requestAndroidExactAlarmPermission()
    expect(pluginMocks.requestExactAlarmPermission).toHaveBeenCalledOnce()

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    pluginMocks.requestExactAlarmPermission.mockRejectedValue(new Error('settings unavailable'))

    await expect(requestAndroidExactAlarmPermission()).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })
})
