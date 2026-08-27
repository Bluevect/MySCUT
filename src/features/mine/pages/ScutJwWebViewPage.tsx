import { CloseOutlined } from '@ant-design/icons'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { resolveScheduleImportThemePreset } from '../../../core/schedule/themePresets'
import { getScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'
import {
  openScutJwWebView,
  type ScutJwWebViewSession,
} from '../../../platform/capacitor/scutJwWebView'
import { InAppBrowser } from '@capgo/capacitor-inappbrowser'

type WebViewLocationState = {
  url?: string
}

function ScutJwWebViewPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [messageApi, contextHolder] = message.useMessage()
  const [isImporting, setIsImporting] = useState(false)

  const webViewSessionRef = useRef<ScutJwWebViewSession | null>(null)
  const isImportingRef = useRef(false)

  const targetUrl = (location.state as WebViewLocationState | null)?.url
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  const importScheduleFromHtml = async (htmlText: string) => {
    if (isImportingRef.current) {
      return
    }

    isImportingRef.current = true
    setIsImporting(true)

    try {
      const fallbackSemesterStartDate = getSemesterStartDate()
      const scheduleData = parseScutScheduleHtml(htmlText, { fallbackSemesterStartDate })
      const themePreset = resolveScheduleImportThemePreset(getScheduleThemeId())
      const nextSemesterStartDate = scheduleData.table.startDate || fallbackSemesterStartDate
      const result = await saveScheduleDataWithOptions(scheduleData, {
        themeId: themePreset.id,
        timeSlotPresetId: 'builtIn',
        semesterStartDate: nextSemesterStartDate,
        preferredName: scheduleData.table.name,
        setActive: true,
      })

      if (!result.ok) {
        throw new Error('课表保存失败，请稍后重试')
      }

      saveSemesterStartDate(nextSemesterStartDate)

      const activeSession = webViewSessionRef.current
      webViewSessionRef.current = null
      if (activeSession) {
        try {
          await activeSession.close()
        } catch (error) {
          console.error('[ScutJwImport] Failed to close imported schedule session:', error)
        }
      }

      // Necessary to hide WebView, or navigation won't work!
      InAppBrowser.hide()

      navigate('/courses', {
        replace: true,
        state: {
          message: `华工教务课表导入成功，已按当前主题“${themePreset.name}”上色`,
        },
      })
    } catch (error) {
      return
    } finally {
      isImportingRef.current = false
    }
  }

  useEffect(() => {
    isImportingRef.current = isImporting
  }, [isImporting])

  useEffect(() => {
    if (!isAndroidNative || !targetUrl) {
      return
    }

    let isCancelled = false

    void openScutJwWebView({
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
    }).then((session) => {
      if (isCancelled) {
        void session.close().catch((error: unknown) => {
          console.error('[ScutJwImport] Failed to close cancelled session: ', error)
        })
        return
      }

      webViewSessionRef.current = session
    }).catch((error: unknown) => {
      if (isCancelled) {
        return
      }

      messageApi.error(error instanceof Error ? error.message : '无法打开教务系统页面')
      navigate('/mine/import-scut-jw', { replace: true })
    })

    return () => {
      isCancelled = true
      isImportingRef.current = false
      const activeSession = webViewSessionRef.current
      webViewSessionRef.current = null
      if (activeSession) {
        void activeSession.close().catch((error: unknown) => {
          console.error('[ScutJwImport] Failed to close unmounted session: ', error)
        })
      }
    }
  }, [isAndroidNative, messageApi, navigate, targetUrl])

  const handleClose = () => {
    const activeSession = webViewSessionRef.current
    webViewSessionRef.current = null
    if (!activeSession) {
      navigate('/mine/import-scut-jw', { replace: true })
      return
    }

    void activeSession.close()
      .catch((error: unknown) => {
        messageApi.error(error instanceof Error ? error.message : '教务系统页面关闭失败')
      })
      .finally(() => navigate('/mine/import-scut-jw', { replace: true }))
  }

  const unavailableMessage = !isAndroidNative
    ? '当前环境不支持该功能，请在安卓原生应用中使用。'
    : !targetUrl
      ? '导入会话已失效，请返回后重新选择教务系统入口。'
      : ''

  return (
    <section className='schedule-settings-page scut-jw-webview-page'>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>教务系统</p>
          <p className='schedule-settings-subtitle'>SCUT WebView</p>
        </div>

        <CircleIconButton ariaLabel='关闭教务系统' icon={<CloseOutlined />} onClick={handleClose} />
      </header>

      <div className='schedule-settings-content'>
        {unavailableMessage ? (
          <p className='schedule-pdf-error'>{unavailableMessage}</p>
        ) : (
          <p className='schedule-settings-current-date'>
            {isImporting ? '正在导入当前页面...' : '请在网页右下角点击“导入当前页面”。'}
          </p>
        )}
      </div>
    </section>
  )
}

export default ScutJwWebViewPage
