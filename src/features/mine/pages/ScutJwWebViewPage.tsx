import { CloseOutlined } from '@ant-design/icons'
import { Capacitor } from '@capacitor/core'
import { BackgroundColor, CloseAction, InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser'
import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { resolveScheduleImportThemePreset } from '../../../core/schedule/themePresets'
import { getScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

type WebViewLocationState = {
  url?: string
}

function ScutJwWebViewPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [messageApi, contextHolder] = message.useMessage()
  const [isImporting, setIsImporting] = useState(false)
  const [isBrowserClosed, setIsBrowserClosed] = useState(false)

  const webviewIdRef = useRef<string | null>(null)
  const isImportingRef = useRef(false)
  const isUnmountedRef = useRef(false)

  const targetUrl = (location.state as WebViewLocationState | null)?.url
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  useEffect(() => {
    isImportingRef.current = isImporting
  }, [isImporting])

  useEffect(() => {
    if (!isAndroidNative || !targetUrl) {
      return
    }

    isUnmountedRef.current = false

    const injectImportButton = (id: string) => {
      InAppBrowser.executeScript({
        id,
        code: `
          (() => {
            document.getElementById('myscut-import-schedule-button')?.remove();
            const button = document.createElement('button');
            button.id = 'myscut-import-schedule-button';
            button.textContent = '导入当前页面';
            Object.assign(button.style, {
              position: 'fixed',
              right: '16px',
              bottom: '24px',
              zIndex: '2147483647',
              padding: '12px 16px',
              border: '0',
              borderRadius: '999px',
              background: '#1677ff',
              color: '#fff',
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            });
            button.addEventListener('click', () => {
              window.mobileApp.postMessage({
                detail: {
                  message: 'captureHTML',
                  html: document.documentElement.outerHTML,
                },
              });
            });
            document.documentElement.appendChild(button);
          })();
        `,
      })
    }

    const importScheduleFromHtml = async (htmlText: string) => {
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

        InAppBrowser.hide()
        navigate('/courses', {
          replace: true,
          state: {
            message: `华工教务课表导入成功，已按当前主题“${themePreset.name}”上色`,
          }
        })
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : '华工教务课表导入失败')
      } finally {
        isImportingRef.current = false
        setIsImporting(false)
      }
    }

    const openBrowser = async () => {
      InAppBrowser.clearAllCookies()
      InAppBrowser.clearCache()

      const handleClose = await InAppBrowser.addListener('closeEvent', () => {
        if (isUnmountedRef.current) {
          return
        }

        webviewIdRef.current = null
        setIsBrowserClosed(true)

        navigate('/mine/import-scut-jw')
      })

      const handlePageLoaded = await InAppBrowser.addListener('browserPageLoaded', (event) => {
        if (isUnmountedRef.current) {
          return
        }

        const id = event.id || webviewIdRef.current
        if (id) injectImportButton(id)
      })

      const handleMessage = await InAppBrowser.addListener('messageFromWebview', async (event) => {
        const detail = event.detail
        if (isUnmountedRef.current || detail?.message !== 'captureHTML' || typeof detail.html !== 'string' || isImportingRef.current) {
          return
        }

        isImportingRef.current = true
        setIsImporting(true)
        importScheduleFromHtml(detail.html)
      })

      try {
        const { id } = await InAppBrowser.openWebView({
          url: targetUrl,
          openBlankTargetInWebView: true,
          toolbarType: ToolBarType.NAVIGATION,
          closeAction: CloseAction.CLOSE,
          title: '从教务导入课表',
          handleDownloads: true,
          backgroundColor: BackgroundColor.WHITE
        })

        webviewIdRef.current = id
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : '无法打开教务系统页面')
        navigate('/mine/import-scut-jw', { replace: true })
      }

      return () => {
        void Promise.all([handleClose, handlePageLoaded, handleMessage].map((handle) => handle.remove().catch(() => undefined)))
      }
    }

    let removeListeners: (() => void) | undefined

    void openBrowser().then((cleanup) => {
      removeListeners = cleanup
    })

    return () => {
      isUnmountedRef.current = true
      removeListeners?.()

      if (webviewIdRef.current) {
        void InAppBrowser.close({ id: webviewIdRef.current })
      }

      webviewIdRef.current = null
    }
  }, [isAndroidNative, messageApi, navigate, targetUrl])

  const handleClose = () => {
    if (webviewIdRef.current) {
      void InAppBrowser.close({ id: webviewIdRef.current })
    }
    navigate('/mine/import-scut-jw', { replace: true })
  }

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
        <p className='schedule-settings-current-date'>
          {isBrowserClosed ? '浏览器已关闭，可返回上一页。' : isImporting ? '正在导入当前页面...' : '请在网页右下角点击“导入当前页面”。'}
        </p>
      </div>
    </section>
  )
}

export default ScutJwWebViewPage
