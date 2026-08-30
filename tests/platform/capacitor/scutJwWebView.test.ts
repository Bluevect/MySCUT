import { beforeEach, describe, expect, it, vi } from 'vitest'

const pluginMocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  clearAllCookies: vi.fn(),
  close: vi.fn(),
  executeScript: vi.fn(),
  openWebView: vi.fn(),
  listeners: new Map<string, (event: Record<string, unknown>) => void>(),
  removeHandles: [] as Array<ReturnType<typeof vi.fn>>,
}))

vi.mock('@capgo/capacitor-inappbrowser', () => ({
  BackgroundColor: { WHITE: 'white' },
  CloseAction: { CLOSE: 'close' },
  ToolBarType: { NAVIGATION: 'navigation' },
  InAppBrowser: {
    addListener: pluginMocks.addListener,
    clearAllCookies: pluginMocks.clearAllCookies,
    close: pluginMocks.close,
    executeScript: pluginMocks.executeScript,
    openWebView: pluginMocks.openWebView,
  },
}))

import { openScutJwWebView } from '../../../src/platform/capacitor/scutJwWebView'

describe('openScutJwWebView', () => {
  beforeEach(() => {
    pluginMocks.listeners.clear()
    pluginMocks.removeHandles.length = 0
    pluginMocks.clearAllCookies.mockReset().mockResolvedValue(undefined)
    pluginMocks.close.mockReset().mockResolvedValue(undefined)
    pluginMocks.executeScript.mockReset().mockResolvedValue(undefined)
    pluginMocks.openWebView.mockReset().mockResolvedValue({ id: 'jw-webview' })
    pluginMocks.addListener.mockReset().mockImplementation(async (
      eventName: string,
      listener: (event: Record<string, unknown>) => void,
    ) => {
      pluginMocks.listeners.set(eventName, listener)
      const remove = vi.fn().mockResolvedValue(undefined)
      pluginMocks.removeHandles.push(remove)
      return { remove }
    })
  })

  it('opens an isolated session and accepts events only from its own webview', async () => {
    const onClose = vi.fn()
    const onError = vi.fn()
    const onHtmlCaptured = vi.fn().mockResolvedValue(undefined)
    const session = await openScutJwWebView({
      url: 'https://jw.example.edu.cn/',
      onClose,
      onError,
      onHtmlCaptured,
    })

    expect(pluginMocks.clearAllCookies).toHaveBeenCalledOnce()
    expect(pluginMocks.openWebView).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://jw.example.edu.cn/',
      handleDownloads: false,
      persistWebViewData: false,
      preventDeeplink: true,
    }))

    // Temporary approach, may need a better solution
    // pluginMocks.listeners.get('browserPageLoaded')?.({ id: 'other-webview' })
    // expect(pluginMocks.executeScript).not.toHaveBeenCalled()

    pluginMocks.listeners.get('browserPageLoaded')?.({ id: 'jw-webview' })
    await vi.waitFor(() => {
      expect(pluginMocks.executeScript).toHaveBeenCalledWith(expect.objectContaining({
        id: 'jw-webview',
      }))
    })

    // Same as above
    // pluginMocks.listeners.get('messageFromWebview')?.({
    //   id: 'other-webview',
    //   detail: { message: 'captureHTML', html: '<html>other</html>' },
    // })
    // expect(onHtmlCaptured).not.toHaveBeenCalled()

    pluginMocks.listeners.get('messageFromWebview')?.({
      id: 'jw-webview',
      detail: { message: 'captureHTML', html: '<html>schedule</html>' },
    })
    await vi.waitFor(() => {
      expect(onHtmlCaptured).toHaveBeenCalledWith('<html>schedule</html>')
    })

    pluginMocks.listeners.get('urlChangeEvent')?.({
      id: 'jw-webview',
      url: 'https://auth.example.edu.cn/login',
    })

    await session.close()

    expect(pluginMocks.close).toHaveBeenCalledWith({ id: 'jw-webview' })
    expect(pluginMocks.clearAllCookies).toHaveBeenCalledTimes(2)
    expect(pluginMocks.removeHandles).toHaveLength(4)
    for (const remove of pluginMocks.removeHandles) {
      expect(remove).toHaveBeenCalledOnce()
    }
    expect(onClose).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('cleans up and reports a native close only for the active webview', async () => {
    const onClose = vi.fn()
    const session = await openScutJwWebView({
      url: 'https://jw.example.edu.cn/',
      onClose,
      onError: vi.fn(),
      onHtmlCaptured: vi.fn(),
    })

    pluginMocks.listeners.get('closeEvent')?.({ id: 'other-webview' })
    expect(onClose).not.toHaveBeenCalled()

    pluginMocks.listeners.get('closeEvent')?.({ id: 'jw-webview' })
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })

    expect(pluginMocks.close).not.toHaveBeenCalled()
    expect(pluginMocks.clearAllCookies).toHaveBeenCalledTimes(2)
    await session.close()
    expect(pluginMocks.close).not.toHaveBeenCalled()
  })

  it('rejects unexpectedly large page captures before parsing them', async () => {
    const onError = vi.fn()
    const onHtmlCaptured = vi.fn()
    const session = await openScutJwWebView({
      url: 'https://jw.example.edu.cn/',
      onClose: vi.fn(),
      onError,
      onHtmlCaptured,
    })

    pluginMocks.listeners.get('messageFromWebview')?.({
      id: 'jw-webview',
      detail: {
        message: 'captureHTML',
        html: 'x'.repeat(5 * 1024 * 1024 + 1),
      },
    })

    expect(onHtmlCaptured).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: '华工教务页面：内容大小超过 512 KiB 限制，请确认内容来自受支持的课表导出',
    }))
    await session.close()
  })

  it('disables the injected import button and ignores duplicate captures while importing', async () => {
    let finishImport = () => undefined
    const pendingImport = new Promise<void>((resolve) => {
      finishImport = resolve
    })
    const onHtmlCaptured = vi.fn(() => pendingImport)
    const session = await openScutJwWebView({
      url: 'https://jw.example.edu.cn/',
      onClose: vi.fn(),
      onError: vi.fn(),
      onHtmlCaptured,
    })
    const captureEvent = {
      id: 'jw-webview',
      detail: { message: 'captureHTML', html: '<html>schedule</html>' },
    }

    pluginMocks.listeners.get('messageFromWebview')?.(captureEvent)
    pluginMocks.listeners.get('messageFromWebview')?.(captureEvent)

    await vi.waitFor(() => {
      expect(onHtmlCaptured).toHaveBeenCalledOnce()
      expect(pluginMocks.executeScript).toHaveBeenCalledWith(expect.objectContaining({
        id: 'jw-webview',
        code: expect.stringContaining('button.disabled = true'),
      }))
    })

    finishImport()
    await vi.waitFor(() => {
      expect(pluginMocks.executeScript).toHaveBeenCalledWith(expect.objectContaining({
        id: 'jw-webview',
        code: expect.stringContaining('button.disabled = false'),
      }))
    })
    await session.close()
  })

  it('rejects unsupported target URLs before opening a native webview', async () => {
    await expect(openScutJwWebView({
      url: 'javascript:alert(1)',
      onClose: vi.fn(),
      onError: vi.fn(),
      onHtmlCaptured: vi.fn(),
    })).rejects.toThrow('仅支持 HTTP 或 HTTPS')

    expect(pluginMocks.openWebView).not.toHaveBeenCalled()
  })

  it('does not expose native failure details to the caller', async () => {
    pluginMocks.openWebView.mockRejectedValueOnce(new Error(
      'Cookie: TEST-SECRET; response=<html>private schedule</html>',
    ))

    const error = await openScutJwWebView({
      url: 'https://jw.example.edu.cn/private?token=TEST-TOKEN',
      onClose: vi.fn(),
      onError: vi.fn(),
      onHtmlCaptured: vi.fn(),
    }).catch((caughtError: unknown) => caughtError)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('无法打开教务系统页面，请检查网络和访问地址后重试')
    expect((error as Error).message).not.toContain('TEST-SECRET')
    expect((error as Error).message).not.toContain('TEST-TOKEN')
    expect((error as Error).message).not.toContain('private schedule')
  })
})
