// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestAnimatedBack } from '../../../src/core/navigation/animatedBack'
import { initializeScheduleStorage } from '../../../src/core/schedule/storage'
import { InMemoryMigrationJournal, InMemoryPersistentStore } from '../../../src/core/storage'
import MineDetailPage from '../../../src/features/mine/MineDetailPage'
import AiSettingsPage from '../../../src/features/mine/pages/AiSettingsPage'
import ScheduleIntersectionPage from '../../../src/features/mine/pages/ScheduleIntersectionPage'
import ScheduleSettingsPage from '../../../src/features/mine/pages/ScheduleSettingsPage'

vi.mock('../../../src/platform/web/theme/GlobalThemeProvider', () => ({
  useGlobalTheme: () => ({ themeFamily: 'blue', mode: 'light', resolvedMode: 'light' }),
}))

const pages = [
  {
    path: '/mine/ai-settings',
    element: createElement(AiSettingsPage),
    closeLabel: '关闭 AI 设置页面',
  },
  {
    path: '/mine/faq',
    element: createElement(MineDetailPage, { title: '常见问答' }),
    closeLabel: '关闭详情页面',
  },
  {
    path: '/mine/schedule-intersection',
    element: createElement(ScheduleIntersectionPage),
    closeLabel: '关闭页面',
  },
  {
    path: '/mine/schedule-settings',
    element: createElement(ScheduleSettingsPage),
    closeLabel: '关闭课表设置',
  },
]

let root: Root | null = null
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function LocationProbe() {
  return createElement('p', { 'data-testid': 'location' }, useLocation().pathname)
}

beforeEach(async () => {
  localStorage.clear()
  await initializeScheduleStorage(
    { store: new InMemoryPersistentStore(), migrationJournal: new InMemoryMigrationJournal() },
    localStorage,
  )
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe.each(pages)('detail-page animated back at $path', ({ path, element, closeLabel }) => {
  it.each(['hardware back', 'close button'] as const)(
    'consumes repeated back presses while the %s transition is closing',
    async (firstAction) => {
      vi.useFakeTimers()
      const container = document.createElement('div')
      document.body.append(container)
      root = createRoot(container)
      await act(async () => {
        root?.render(
          createElement(
            MemoryRouter,
            { initialEntries: [path] },
            createElement(LocationProbe),
            createElement(
              Routes,
              null,
              createElement(Route, {
                path,
                element,
              }),
              createElement(Route, { path: '/mine', element: createElement('p', null, '我的') }),
            ),
          ),
        )
      })
      await act(async () => vi.advanceTimersByTime(16))

      await act(async () => {
        if (firstAction === 'close button') {
          const button = container.querySelector<HTMLButtonElement>(
            `button[aria-label="${closeLabel}"]`,
          )
          expect(button).not.toBeNull()
          button?.click()
        } else {
          expect(requestAnimatedBack()).toBe(true)
        }
      })
      await act(async () => vi.advanceTimersByTime(100))
      await act(async () => expect(requestAnimatedBack()).toBe(true))
      expect(container.querySelector('[data-testid=location]')?.textContent).toBe(path)
      await act(async () => vi.advanceTimersByTime(120))
      expect(container.querySelector('[data-testid=location]')?.textContent).toBe('/mine')
    },
  )
})
