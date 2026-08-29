// @vitest-environment jsdom

import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../src/app/routes'
import {
  RouteContentErrorBoundary,
  RouteLoadingView,
} from '../../src/components/AppRouteStates'
import {
  StorageRuntimeProvider,
  useStorageRuntime,
} from '../../src/platform/storage/StorageRuntimeProvider'
import type { ApplicationStorageRuntime } from '../../src/platform/storage/bootstrapApplicationStorage'
import { StorageError } from '../../src/core/storage'

const roots: Root[] = []
const preventReportedWindowError = (event: ErrorEvent) => event.preventDefault()

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

async function renderInDocument(element: ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(element)
    await Promise.resolve()
  })

  return container
}

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) {
      await act(async () => root.unmount())
    }
  }
  window.removeEventListener('error', preventReportedWindowError)
  document.body.innerHTML = ''
})

describe('application startup states', () => {
  it('shows the branded shell while storage initialization is pending', () => {
    const pendingRuntime = new Promise<ApplicationStorageRuntime>(() => undefined)
    const markup = renderToStaticMarkup(createElement(
      StorageRuntimeProvider,
      { bootstrapRuntime: pendingRuntime },
      createElement('p', null, '应用已就绪'),
    ))

    expect(markup).toContain('role="status"')
    expect(markup).toContain('MySCUT')
    expect(markup).toContain('正在初始化本地数据')
    expect(markup).not.toContain('应用已就绪')
  })

  it('enters the application automatically after storage initialization succeeds', async () => {
    let resolveRuntime: ((runtime: ApplicationStorageRuntime) => void) | null = null
    const bootstrapRuntime = new Promise<ApplicationStorageRuntime>((resolve) => {
      resolveRuntime = resolve
    })
    const container = await renderInDocument(createElement(
      StorageRuntimeProvider,
      { bootstrapRuntime },
      createElement('p', null, '应用已就绪'),
    ))

    expect(container.textContent).toContain('正在初始化本地数据')

    await act(async () => {
      resolveRuntime?.({ status: 'ready', error: null })
      await Promise.resolve()
    })

    expect(container.textContent).toBe('应用已就绪')
  })

  it('continues into the existing read-only application state after initialization fails', async () => {
    function RuntimeProbe() {
      return createElement('p', null, useStorageRuntime().status)
    }

    const bootstrapRuntime = Promise.resolve<ApplicationStorageRuntime>({
      status: 'readOnly',
      error: new StorageError('unavailable', 'storage unavailable'),
    })
    const container = await renderInDocument(createElement(
      StorageRuntimeProvider,
      { bootstrapRuntime },
      createElement(RuntimeProbe),
    ))

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toBe('readOnly')
  })
})

describe('application route states', () => {
  it('uses one accessible loading view for lazy routes', () => {
    const markup = renderToStaticMarkup(createElement(RouteLoadingView))

    expect(markup).toContain('role="status"')
    expect(markup).toContain('正在打开页面')
  })

  it('recovers route content without rendering raw error details', async () => {
    let shouldThrow = true
    const onRetry = vi.fn(() => {
      shouldThrow = false
    })
    const onReturnToCourses = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventReportedWindowError)

    function RecoverableRoute() {
      if (shouldThrow) {
        throw new Error('SECRET_RAW_ROUTE_ERROR')
      }
      return createElement('p', null, '页面已恢复')
    }

    const container = await renderInDocument(createElement(
      RouteContentErrorBoundary,
      { onRetry, onReturnToCourses },
      createElement(RecoverableRoute),
    ))

    expect(container.textContent).toContain('当前页面暂时无法显示')
    expect(container.textContent).not.toContain('SECRET_RAW_ROUTE_ERROR')

    const returnButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('返回课程页'),
    )
    await act(async () => returnButton?.click())
    expect(onReturnToCourses).toHaveBeenCalledOnce()

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('重试当前页面'),
    )
    await act(async () => retryButton?.click())

    expect(onRetry).toHaveBeenCalledOnce()
    expect(container.textContent).toBe('页面已恢复')
    consoleError.mockRestore()
  })

  it('renders a not-found page for unknown application paths', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/not-a-real-page'] },
      createElement(AppRoutes),
    ))

    expect(markup).toContain('页面不存在')
    expect(markup).toContain('返回课程页')
    expect(markup).toContain('href="/courses"')
  })
})
