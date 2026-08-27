import type { PluginListenerHandle } from '@capacitor/core'
import {
  BackgroundColor,
  CloseAction,
  InAppBrowser,
  ToolBarType,
} from '@capgo/capacitor-inappbrowser'

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

export type ScutJwWebViewSession = {
  close: () => Promise<void>
}

type OpenScutJwWebViewOptions = {
  url: string
  onClose: () => void
  onError: (error: Error) => void
  onHtmlCaptured: (html: string) => void | Promise<void>
}

function toError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage)
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

export async function openScutJwWebView(
  options: OpenScutJwWebViewOptions,
): Promise<ScutJwWebViewSession> {
  const targetUrl = validateTargetUrl(options.url)
  const listenerHandles: PluginListenerHandle[] = []
  const visitedUrls = new Set([targetUrl])
  let webViewId: string | null = null
  let isClosed = false

  const isCurrentWebView = (eventId?: string) => (
    !isClosed && webViewId !== null && (!eventId || eventId === webViewId)
  )

  const reportError = (error: unknown, fallbackMessage: string) => {
    options.onError(toError(error, fallbackMessage))
  }

  const injectImportButton = async (id: string) => {
    await InAppBrowser.executeScript({
      id,
      code: IMPORT_BUTTON_SCRIPT,
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
    }
  }

  try {
    await clearSessionCookies()

    listenerHandles.push(await InAppBrowser.addListener('closeEvent', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      isClosed = true
      webViewId = null
      void removeListenerHandles(listenerHandles)
        .then(clearSessionCookies)
        .catch((error: unknown) => reportError(error, '教务系统会话清理失败'))
        .finally(options.onClose)
    }))

    listenerHandles.push(await InAppBrowser.addListener('urlChangeEvent', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      const visitedUrl = normalizeHttpUrl(event.url)
      if (visitedUrl) {
        visitedUrls.add(visitedUrl)
      }
    }))

    listenerHandles.push(await InAppBrowser.addListener('browserPageLoaded', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      const eventWebViewId = event.id || webViewId
      if (eventWebViewId) {
        void injectImportButton(eventWebViewId)
          .catch((error: unknown) => reportError(error, '无法添加课表导入按钮'))
      }
    }))

    listenerHandles.push(await InAppBrowser.addListener('messageFromWebview', (event) => {
      if (!isCurrentWebView(event.id)) {
        return
      }

      const detail = event.detail
      if (detail?.message !== CAPTURE_HTML_MESSAGE || typeof detail.html !== 'string') {
        return
      }

      if (detail.html.length > MAX_CAPTURED_HTML_LENGTH) {
        reportError(new Error('当前页面内容过大，无法安全导入'), '课表页面内容过大')
        return
      }

      void Promise.resolve(options.onHtmlCaptured(detail.html))
        .catch((error: unknown) => reportError(error, '课表页面处理失败'))
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
  } catch (error) {
    try {
      await closeSession()
    } catch (cleanupError) {
      reportError(cleanupError, '教务系统会话清理失败')
    }

    throw toError(error, '无法打开教务系统页面')
  }

  return {
    close: closeSession,
  }
}
