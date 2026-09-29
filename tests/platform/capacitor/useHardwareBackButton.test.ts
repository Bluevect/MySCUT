// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function LocationProbe() {
  return createElement('p', { 'data-testid': 'location' }, useLocation().pathname)
}

function BackHarness({ onDismiss }: { onDismiss: () => void }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  overlayController = { setOpen: setIsOverlayOpen }

  useBackDismiss(isOverlayOpen, onDismiss)
  useHardwareBackButton()

  return createElement(LocationProbe)
}

async function renderApp(initialPath: string, onDismiss: () => void = vi.fn()) {
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
          element: createElement(BackHarness, { onDismiss }),
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
  document.body.innerHTML = ''
})

describe('useHardwareBackButton', () => {
  it('walks up one level per press and exits the app only from the root page', async () => {
    const container = await renderApp('/mine/schedule-settings')

    await pressBackButton()
    expect(readPath(container)).toBe('/mine')

    await pressBackButton()
    expect(readPath(container)).toBe('/courses')
    expect(capacitorMocks.exitApp).not.toHaveBeenCalled()

    await pressBackButton()
    expect(capacitorMocks.exitApp).toHaveBeenCalledOnce()
    expect(readPath(container)).toBe('/courses')
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
