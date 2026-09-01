import { Capacitor } from '@capacitor/core'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { TouchEvent } from 'react'
import { message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { SinglePendingOperation } from '../../../core/async/singlePendingOperation'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { resolveScheduleImportThemePreset } from '../../../core/schedule/themePresets'
import { getScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'
import {
  closeActiveWebView,
  dispatchTouchEvent,
  goBackInActiveWebView,
  hideActiveWebView,
  openScutJwWebView,
  reloadActiveWebView,
  type ScutJwWebViewSession,
} from '../../../platform/capacitor/scutJwWebView'
import { logScutJwImportDiagnostic } from '../../../platform/capacitor/scutJwImportDiagnostics'
import { getStatusBarHeight } from '../../../platform/capacitor/getStatusBarHeight'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { CloseOutlined, LeftOutlined, ReloadOutlined } from '@ant-design/icons'

type WebViewLocationState = {
  url?: string
}

function ScutJwWebViewPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [messageApi, contextHolder] = message.useMessage()

  const webViewSessionRef = useRef<ScutJwWebViewSession | null>(null)
  const importOperationRef = useRef(new SinglePendingOperation())

  const targetUrl = (location.state as WebViewLocationState | null)?.url
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  const statusBarHeightRef = useRef(0)
  const navbarHeightRef = useRef(0)
  const navbarRef = useRef<HTMLDivElement | null>(null)

  const importScheduleFromHtml = async (htmlText: string) => {
    const result = await importOperationRef.current.run(async () => {
      try {
        logScutJwImportDiagnostic({
          stage: 'parse-started',
          targetUrl,
          responseLength: htmlText.length,
        })
        const fallbackSemesterStartDate = getSemesterStartDate()
        const scheduleData = parseScutScheduleHtml(htmlText, { fallbackSemesterStartDate })
        const courseCount = scheduleData.courses.length
        const lessonCount = scheduleData.lessons.length
        logScutJwImportDiagnostic({
          stage: 'parse-completed',
          targetUrl,
          responseLength: htmlText.length,
          courseCount,
          lessonCount,
        })
        const themePreset = resolveScheduleImportThemePreset(getScheduleThemeId())
        const nextSemesterStartDate = scheduleData.table.startDate || fallbackSemesterStartDate
        logScutJwImportDiagnostic({
          stage: 'save-started',
          targetUrl,
          courseCount,
          lessonCount,
        })
        const saveResult = await saveScheduleDataWithOptions(scheduleData, {
          themeId: themePreset.id,
          timeSlotPresetId: 'builtIn',
          semesterStartDate: nextSemesterStartDate,
          preferredName: scheduleData.table.name,
          setActive: true,
        })

        if (!saveResult.ok) {
          throw new Error('课表保存失败，请稍后重试')
        }

        logScutJwImportDiagnostic({
          stage: 'save-completed',
          targetUrl,
          courseCount,
          lessonCount,
        })
        saveSemesterStartDate(nextSemesterStartDate)

        const activeSession = webViewSessionRef.current
        webViewSessionRef.current = null
        if (activeSession) {
          try {
            await activeSession.close()
          } catch {
            logScutJwImportDiagnostic({
              stage: 'session-close-failed',
              targetUrl,
            })
          }
        }

        // Necessary to hide WebView, or navigation won't work!
        hideActiveWebView()

        navigate('/courses', {
          replace: true,
          state: {
            message: `华工教务课表导入成功，已按当前主题“${themePreset.name}”上色`,
          },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
        logScutJwImportDiagnostic({
          stage: 'import-failed',
          targetUrl,
        })
        messageApi.error(errorMessage)
      }
    })

    if (!result.started) {
      logScutJwImportDiagnostic({
        stage: 'duplicate-import-ignored',
        targetUrl,
      })
    }
  }

  const handleTouch = async (event: TouchEvent<HTMLElement>) => {
    const touch = event.type === 'touchend' || event.type === 'touchcancel'
      ? event.changedTouches[0]
      : event.touches[0]

    if (!touch || !statusBarHeightRef.current) {
      return
    }

    if (touch.clientY <= statusBarHeightRef.current + navbarHeightRef.current) {
      return
    }

    event.preventDefault()

    void dispatchTouchEvent({
      type: event.type as 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
      x: touch.clientX,
      y: touch.clientY - navbarHeightRef.current,
    }).catch((error: unknown) => {
      console.error('[ScutJwImport] Failed to dispatch touch event:', error)
    })
  }

  useLayoutEffect(() => {
    if (!navbarRef.current) {
      return
    }

    navbarHeightRef.current = navbarRef.current.getBoundingClientRect().height
  }, [])

  useEffect(() => {
    if (!isAndroidNative || !targetUrl) {
      return
    }

    if (!navbarHeightRef.current) {
      return
    }

    // Set body transparent
    const previousColorScheme = document.documentElement.style.colorScheme
    const isDarkMode = document.documentElement.classList.contains('dark')

    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
    }

    document.documentElement.style.colorScheme = ''
    document.body.style.backgroundColor = 'transparent'

    let isCancelled = false

    getStatusBarHeight().then((value) => {
      statusBarHeightRef.current = value
    }).then(() => {
      openScutJwWebView({
        url: targetUrl,
        onClose: () => {
          if (isCancelled) {
            return
          }

          webViewSessionRef.current = null
          navigate('/mine/import-scut-jw', { replace: true })
        },
        onError: (error) => {
          if (isCancelled) {
            return
          }

          messageApi.error(error.message)
        },
        onHtmlCaptured: importScheduleFromHtml,
        top: Math.floor(navbarHeightRef.current) - statusBarHeightRef.current,
      }).then((session) => {
        if (isCancelled) {
          void session.close().catch(() => {
            logScutJwImportDiagnostic({
              stage: 'cancelled-session-close-failed',
              targetUrl,
            })
          })
          return
        }

        webViewSessionRef.current = session
      }).catch(() => {
        if (isCancelled) {
          return
        }

        messageApi.error('无法打开教务系统页面，请检查网络和访问地址后重试')
        navigate('/mine/import-scut-jw', { replace: true })
      })
    })

    return () => {
      isCancelled = true

      // Restore background
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
      document.documentElement.style.colorScheme = previousColorScheme
      document.body.style.backgroundColor = ''

      const activeSession = webViewSessionRef.current
      webViewSessionRef.current = null
      if (activeSession) {
        void activeSession.close().catch(() => {
          logScutJwImportDiagnostic({
            stage: 'unmounted-session-close-failed',
            targetUrl,
          })
        })
      }

      closeActiveWebView()
    }
  }, [isAndroidNative, messageApi, navigate, targetUrl])

  const handleClose = () => {
    closeActiveWebView()

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
  }

  const handleBack = () => {
    goBackInActiveWebView()
  }

  const handleReload = () => {
    reloadActiveWebView()
  }

  return (
    <section
      className='scut-jw-webview-page'
      onTouchCancel={handleTouch}
      onTouchEnd={handleTouch}
      onTouchMove={handleTouch}
      onTouchStart={handleTouch}
    >
      {contextHolder}

      <header ref={navbarRef} className='scut-jw-webview-navbar'>
        <div className='scut-jw-webview-nav-group scut-jw-webview-nav-left'>
          <CircleIconButton ariaLabel='关闭页面' icon={<CloseOutlined />} onClick={handleClose} />
        </div>

        <p className='scut-jw-webview-nav-title'>从教务系统导入课表</p>

        <div className='scut-jw-webview-nav-group scut-jw-webview-nav-right'>
          <CircleIconButton ariaLabel='返回上一页' icon={<LeftOutlined />} onClick={handleBack} />
          <CircleIconButton ariaLabel='刷新页面' icon={<ReloadOutlined />} onClick={handleReload} />
        </div>
      </header>
    </section>
  )
}

export default ScutJwWebViewPage
