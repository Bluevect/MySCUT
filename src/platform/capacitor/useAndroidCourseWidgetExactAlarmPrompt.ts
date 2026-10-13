import { useEffect, useRef } from 'react'
import {
  loadAndroidCourseWidgetStatus,
  requestAndroidExactAlarmPermission,
  shouldPromptExactAlarmPermission,
  supportsAndroidCourseWidget,
  syncAndroidCourseWidgetSchedule,
} from './courseWidgetSchedule'
import { confirmWithBackDismiss } from './useBackDismiss'

const PROMPT_CONTENT =
  '系统默认会延迟后台闹钟，小组件可能无法在下课后立即更新。请在系统设置中允许「闹钟和提醒」。'

// Asks for the exact alarm permission only when a widget is placed, and re-syncs once the user
// returns from the system settings screen.
export function useAndroidCourseWidgetExactAlarmPrompt() {
  const hasPromptedRef = useRef(false)
  const isAwaitingPermissionRef = useRef(false)

  useEffect(() => {
    if (!supportsAndroidCourseWidget()) {
      return
    }

    let cancelled = false

    const evaluate = async () => {
      const status = await loadAndroidCourseWidgetStatus()
      if (cancelled || !status) {
        return
      }

      if (status.canScheduleExactAlarms) {
        if (isAwaitingPermissionRef.current) {
          isAwaitingPermissionRef.current = false
          syncAndroidCourseWidgetSchedule()
        }
        return
      }

      if (hasPromptedRef.current || !shouldPromptExactAlarmPermission(status)) {
        return
      }

      hasPromptedRef.current = true
      isAwaitingPermissionRef.current = true
      confirmWithBackDismiss({
        title: '开启精确闹钟',
        content: PROMPT_CONTENT,
        okText: '去设置',
        cancelText: '稍后',
        onOk: () => {
          void requestAndroidExactAlarmPermission()
        },
      })
    }

    void evaluate()

    // Covers a widget placed from the launcher while the app is backgrounded, and the return from
    // the system settings screen.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void evaluate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
