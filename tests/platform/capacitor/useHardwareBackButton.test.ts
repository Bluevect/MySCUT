// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorMocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  backListeners: [] as Array<() => void | Promise<void>>,
  exitApp: vi.fn(),
  isNativePlatform: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => capacitorMocks.isNativePlatform(),
  },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: capacitorMocks.addListener,
    exitApp: capacitorMocks.exitApp,
  },
}))

import { ANIMATED_BACK_EVENT } from '../../../src/core/navigation/animatedBack'
import { useBackDismiss } from '../../../src/platform/capacitor/useBackDismiss'
import {
  registerHardwareBackButtonHandler,
  useHardwareBackButton,
} from '../../../src/platform/capacitor/useHardwareBackButton'

const roots: Root[] = []
const cleanups: Array<() => void> = []
let overlayController: { setOpen: (open: boolean) => void } | null = null
let navigateController: ((to: string, options?: { replace?: boolean }) => void) | null = null

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function LocationProbe() {
  return createElement('p', { 'data-testid': 'location' }, useLocation().pathname)
}

function BackHarness({ onDismiss, onExitHint }: { onDismiss: () => void; onExitHint: () => void }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  overlayController = { setOpen: setIsOverlayOpen }
  navigateController = useNavigate()

  useBackDismiss(isOverlayOpen, onDismiss)
  useHardwareBackButton({ onExitHint })

  return createElement(LocationProbe)
}

async function renderApp(
  initialPath: string,
  onDismiss: () => void = vi.fn(),
  onExitHint: () => void = vi.fn(),
) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '*',
          element: createElement(BackHarness, { onDismiss, onExitHint }),
        }),
      ),
    ))
  })

  return container
}

async function pressBackButton() {
  const listener = capacitorMocks.backListeners.at(-1)
  if (!listener) {
    throw new Error('hardware back listener missing')
  }

  await act(async () => {
    await listener()
  })
}

function readPath(container: HTMLElement) {
  return container.querySelector('[data-testid=location]')?.textContent
}

beforeEach(() => {
  capacitorMocks.backListeners.length = 0
  capacitorMocks.isNativePlatform.mockReset().mockReturnValue(true)
  capacitorMocks.exitApp.mockReset().mockResolvedValue(undefined)
  capacitorMocks.addListener.mockReset().mockImplementation(
    async (eventName: string, listener: () => void | Promise<void>) => {
      if (eventName !== 'backButton') {
        throw new Error(`unexpected listener: ${eventName}`)
      }

      capacitorMocks.backListeners.push(listener)
      return { remove: vi.fn().mockResolvedValue(undefined) }
    },
  )
})

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) {
      await act(async () => root.unmount())
    }
  }

  while (cleanups.length > 0) {
    cleanups.pop()?.()
  }

  overlayController = null
  navigateController = null
  document.body.innerHTML = ''
})

describe('useHardwareBackButton', () => {
  it('walks up one level per press and leaves the app only after confirming at the root', async () => {
    const onExitHint = vi.fn()
    const container = await renderApp('/mine/schedule-settings', vi.fn(), onExitHint)

    await pressBackButton()
    expect(readPath(container)).toBe('/mine')

    await pressBackButton()
    expect(readPath(container)).toBe('/courses')
    expect(capacitorMocks.exitApp).not.toHaveBeenCalled()

    await pressBackButton()
    expect(onExitHint).toHaveBeenCalledOnce()
    expect(capacitorMocks.exitApp).not.toHaveBeenCalled()
    expect(readPath(container)).toBe('/courses')

    await pressBackButton()
    expect(capacitorMocks.exitApp).toHaveBeenCalledOnce()
    expect(readPath(container)).toBe('/courses')
  })

  it('shows the exit hint again once the hint window has elapsed', async () => {
    const onExitHint = vi.fn()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)

    try {
      await renderApp('/courses', vi.fn(), onExitHint)

      await pressBackButton()
      expect(onExitHint).toHaveBeenCalledOnce()
      expect(capacitorMocks.exitApp).not.toHaveBeenCalled()

      nowSpy.mockReturnValue(1_000_000 + 3001)
      await pressBackButton()
      expect(onExitHint).toHaveBeenCalledTimes(2)
      expect(capacitorMocks.exitApp).not.toHaveBeenCalled()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('closes the open overlay instead of leaving the page', async () => {
    const onDismiss = vi.fn()
    const container = await renderApp('/mine/faq', onDismiss)

    await act(async () => {
      overlayController?.setOpen(true)
    })

    await pressBackButton()
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(readPath(container)).toBe('/mine/faq')

    await pressBackButton()
    expect(readPath(container)).toBe('/mine')
  })

  it('lets a page handler claim the back press before default navigation', async () => {
    const container = await renderApp('/mine/faq')
    const handler = vi.fn(() => true)
    cleanups.push(registerHardwareBackButtonHandler(handler))

    await pressBackButton()
    expect(handler).toHaveBeenCalledOnce()
    expect(readPath(container)).toBe('/mine/faq')

    cleanups.pop()?.()
    await pressBackButton()
    expect(readPath(container)).toBe('/mine')
  })

  it('falls through to default navigation when a page handler declines the press', async () => {
    const container = await renderApp('/mine/faq')
    cleanups.push(registerHardwareBackButtonHandler(() => false))

    await pressBackButton()
    expect(readPath(container)).toBe('/mine')
  })

  it('ignores the root hint when the route already moved while the press was awaited', async () => {
    const onExitHint = vi.fn()
    const container = await renderApp('/manual', vi.fn(), onExitHint)

    let releaseHandler: () => void = () => {}
    const handlerBlocked = new Promise<void>((resolve) => {
      releaseHandler = resolve
    })
    cleanups.push(registerHardwareBackButtonHandler(async () => {
      await handlerBlocked
      return false
    }))

    const listener = capacitorMocks.backListeners.at(-1)
    if (!listener) {
      throw new Error('hardware back listener missing')
    }

    let press: Promise<void> = Promise.resolve()
    await act(async () => {
      press = listener()
      await Promise.resolve()
    })

    // The route moves while the page handler is still awaiting
    await act(async () => {
      navigateController?.('/courses', { replace: true })
    })
    expect(readPath(container)).toBe('/courses')

    await act(async () => {
      releaseHandler()
      await press
    })

    expect(onExitHint).not.toHaveBeenCalled()
    expect(capacitorMocks.exitApp).not.toHaveBeenCalled()
  })

  it('honours a page that animates its own back transition', async () => {
    const container = await renderApp('/mine/ai-settings')
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ handled: boolean }>).detail
      detail.handled = true
    }
    window.addEventListener(ANIMATED_BACK_EVENT, handler)

    try {
      await pressBackButton()
      expect(readPath(container)).toBe('/mine/ai-settings')
    } finally {
      window.removeEventListener(ANIMATED_BACK_EVENT, handler)
    }
  })

  it('does not listen on non native platforms', async () => {
    capacitorMocks.isNativePlatform.mockReturnValue(false)

    await renderApp('/mine/faq')

    expect(capacitorMocks.addListener).not.toHaveBeenCalled()
  })
})
