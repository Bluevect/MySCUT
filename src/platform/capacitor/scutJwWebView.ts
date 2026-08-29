import type { PluginListenerHandle } from '@capacitor/core'
import {
  BackgroundColor,
  CloseAction,
  InAppBrowser,
  ToolBarType,
} from '@capgo/capacitor-inappbrowser'
import {
  logScutJwImportDiagnostic,
  type ScutJwImportDiagnosticStage,
} from './scutJwImportDiagnostics'

const CAPTURE_HTML_MESSAGE = 'captureHTML'
const MAX_CAPTURED_HTML_LENGTH = 5 * 1024 * 1024
const IMPORT_BUTTON_SCRIPT = `
  (() => {
    document.getElementById('myscut-import-schedule-button')?.remove();
    const button = document.createElement('button');
    button.id = 'myscut-import-schedule-button';
    button.textContent = '导入当前页面';
    Object.assign(button.style, {
      position: 'fixed',
      right: '16px',
      bottom: '24px',
      zIndex: '999',
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
          message: '${CAPTURE_HTML_MESSAGE}',
          html: document.documentElement.outerHTML,
        },
      });
    });
    document.documentElement.appendChild(button);
  })();
`

function buildImportButtonPendingScript(isPending: boolean) {
  const buttonText = isPending ? '正在导入…' : '导入当前页面'

  return `
    (() => {
      const button = document.getElementById('myscut-import-schedule-button');
      if (!(button instanceof HTMLButtonElement)) return;
      button.disabled = ${isPending};
      button.textContent = '${buttonText}';
      button.style.opacity = '${isPending ? '0.72' : '1'}';
      button.style.cursor = '${isPending ? 'wait' : 'pointer'}';
    })();
  `
}

export type ScutJwWebViewSession = {
  close: () => Promise<void>
}

type OpenScutJwWebViewOptions = {
  url: string
  onClose: () => void
  onError: (error: Error) => void
  onHtmlCaptured: (html: string) => void | Promise<void>
}

function normalizeHttpUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return null
  }

  return null
}

function validateTargetUrl(rawUrl: string) {
  const targetUrl = normalizeHttpUrl(rawUrl)
  if (targetUrl) {
    return targetUrl
  }

  throw new Error('教务系统地址无效，仅支持 HTTP 或 HTTPS')
}

async function removeListenerHandles(handles: PluginListenerHandle[]) {
  const activeHandles = handles.splice(0)
  await Promise.allSettled(activeHandles.map((handle) => handle.remove()))
}

export function hideActiveWebView() {
  void InAppBrowser.hide()
}

export async function openScutJwWebView(
  options: OpenScutJwWebViewOptions,
): Promise<ScutJwWebViewSession> {
  const targetUrl = validateTargetUrl(options.url)
  const listenerHandles: PluginListenerHandle[] = []
  let webViewId: string | null = null
  let isClosed = false
  let isCapturePending = false

  const isCurrentWebView = (eventId?: string) => (
    !isClosed && webViewId !== null && (!eventId || eventId === webViewId)
  )

  const reportError = (stage: ScutJwImportDiagnosticStage, fallbackMessage: string) => {
    logScutJwImportDiagnostic({ stage, targetUrl })
    options.onError(new Error(fallbackMessage))
  }

  const injectImportButton = async (id: string) => {
    await InAppBrowser.executeScript({
      id,
      code: IMPORT_BUTTON_SCRIPT,
    })
  }

  const setImportButtonPending = async (id: string, isPending: boolean) => {
    await InAppBrowser.executeScript({
      id,
      code: buildImportButtonPendingScript(isPending),
    })
  }

  const clearSessionCookies = async () => {
    // clearCookies rejects with `WebView is not initialized` error if called before any WebView existed
    // Use clearAllCookies instead
    await InAppBrowser.clearAllCookies()
  }

  const closeSession = async () => {
    if (isClosed) {
      return
    }

    isClosed = true
    const activeWebViewId = webViewId
    webViewId = null
    await removeListenerHandles(listenerHandles)

    try {
      if (activeWebViewId) {
        await InAppBrowser.close({ id: activeWebViewId })
      }
    } finally {
      await clearSessionCookies()
      logScutJwImportDiagnostic({
        stage: 'session-closed',
        targetUrl,
      })
    }
  }

  try {
    logScutJwImportDiagnostic({
      stage: 'session-opening',
      targetUrl,
    })
    await clearSessionCookies()

    listenerHandles.push(await InAppBrowser.addListener('closeEvent', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      isClosed = true
      webViewId = null
      void removeListenerHandles(listenerHandles)
        .then(clearSessionCookies)
        .catch(() => reportError('session-cleanup-failed', '教务系统会话清理失败，请重新打开导入页面'))
        .finally(options.onClose)
    }))

    listenerHandles.push(await InAppBrowser.addListener('urlChangeEvent', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      const visitedUrl = normalizeHttpUrl(event.url)
      if (visitedUrl) {
        logScutJwImportDiagnostic({
          stage: 'page-origin-changed',
          targetUrl: visitedUrl,
        })
      }
    }))

    listenerHandles.push(await InAppBrowser.addListener('browserPageLoaded', (event) => {
      /*
        Don't use this guard.
        Button won't be injected in personal schedule page for some unknown reasons
        
        if (!isCurrentWebView(event.id)) {
          return
        }
      */

      const eventWebViewId = event.id || webViewId
      if (eventWebViewId) {
        logScutJwImportDiagnostic({
          stage: 'page-loaded',
          targetUrl,
        })
        void injectImportButton(eventWebViewId)
          .catch(() => reportError('button-injection-failed', '无法添加课表导入按钮，请刷新页面后重试'))
      }
    }))

    listenerHandles.push(await InAppBrowser.addListener('messageFromWebview', (event) => {
      /*
        Don't use this guard.
        The message won't be handled.
        
        if (!isCurrentWebView(event.id)) {
          return
        }
      */

      const detail = event.detail
      if (detail?.message !== CAPTURE_HTML_MESSAGE || typeof detail.html !== 'string') {
        return
      }

      if (isCapturePending) {
        logScutJwImportDiagnostic({
          stage: 'duplicate-capture-ignored',
          targetUrl,
        })
        return
      }

      if (detail.html.length > MAX_CAPTURED_HTML_LENGTH) {
        reportError('capture-rejected', '当前页面内容过大，无法安全导入')
        return
      }

      isCapturePending = true
      const eventWebViewId = event.id || webViewId
      if (eventWebViewId) {
        void setImportButtonPending(eventWebViewId, true).catch(() => {
          logScutJwImportDiagnostic({
            stage: 'button-state-update-failed',
            targetUrl,
          })
        })
      }

      logScutJwImportDiagnostic({
        stage: 'page-captured',
        targetUrl,
        responseLength: detail.html.length,
      })
      void Promise.resolve(options.onHtmlCaptured(detail.html))
        .catch(() => reportError('capture-processing-failed', '课表页面处理失败，请确认已打开个人课表查询页面'))
        .finally(() => {
          isCapturePending = false
          if (!isClosed && eventWebViewId) {
            void setImportButtonPending(eventWebViewId, false).catch(() => {
              logScutJwImportDiagnostic({
                stage: 'button-state-update-failed',
                targetUrl,
              })
            })
          }
        })
    }))

    const openedWebView = await InAppBrowser.openWebView({
      url: targetUrl,
      openBlankTargetInWebView: true,
      toolbarType: ToolBarType.NAVIGATION,
      closeAction: CloseAction.CLOSE,
      title: '从教务导入课表',
      backgroundColor: BackgroundColor.WHITE,
      handleDownloads: false,
      persistWebViewData: false,
      preventDeeplink: true,
    })

    webViewId = openedWebView.id
    await injectImportButton(openedWebView.id)
    logScutJwImportDiagnostic({
      stage: 'session-opened',
      targetUrl,
    })
  } catch {
    try {
      await closeSession()
    } catch {
      reportError('session-cleanup-failed', '教务系统会话清理失败，请重新打开导入页面')
    }

    logScutJwImportDiagnostic({
      stage: 'session-open-failed',
      targetUrl,
    })
    throw new Error('无法打开教务系统页面，请检查网络和访问地址后重试')
  }

  return {
    close: closeSession,
  }
}
