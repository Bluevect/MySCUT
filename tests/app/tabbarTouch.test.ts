// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import QmuiTabbar from '../../src/qmui/tabbar/Tabbar'

const onLocation = vi.fn()
let root: Root
let container: HTMLDivElement
let link: HTMLAnchorElement

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function LocationProbe() {
  const location = useLocation()
  useEffect(() => onLocation(location.pathname), [location])
  return createElement('p', { 'data-testid': 'location' }, location.pathname)
}

type Point = { identifier: number; clientX: number; clientY: number }
const point = (x = 60, y = 32, identifier = 1): Point => ({ identifier, clientX: x, clientY: y })

async function touch(type: string, touches: Point[], changedTouches = touches) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
  })
  await act(async () => link.querySelector('span')?.dispatchEvent(event))
  return event
}

beforeEach(async () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/courses'] },
        createElement(QmuiTabbar, {
          items: [
            { to: '/courses', label: '课程', icon: createElement('span', null, 'calendar') },
            { to: '/manual', label: '手册', icon: createElement('span', null, 'book') },
          ],
        }),
        createElement(LocationProbe),
      ),
    )
  })
  link = container.querySelector<HTMLAnchorElement>('a[href="/manual"]')!
  vi.spyOn(link, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 120, 64))
  onLocation.mockClear()
})

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
})

describe('bottom tab touch navigation', () => {
  it('activates one link even when the WebView omits the compatibility click after a swipe', async () => {
    await touch('touchstart', [point()])
    const end = await touch('touchend', [], [point()])

    expect(container.querySelector('[data-testid=location]')?.textContent).toBe('/manual')
    expect(onLocation).toHaveBeenCalledExactlyOnceWith('/manual')
    expect(end.defaultPrevented).toBe(true)
  })

  it('preserves ordinary click activation for mouse and keyboard users', async () => {
    await act(async () => link.click())
    expect(onLocation).toHaveBeenCalledExactlyOnceWith('/manual')
  })

  it('does not activate after dragging away and returning to the starting point', async () => {
    await touch('touchstart', [point()])
    await touch('touchmove', [point(80)])
    await touch('touchend', [], [point()])
    expect(onLocation).not.toHaveBeenCalled()
  })

  it('does not activate a cancelled touch', async () => {
    await touch('touchstart', [point()])
    await touch('touchcancel', [], [point()])
    await touch('touchend', [], [point()])
    expect(onLocation).not.toHaveBeenCalled()
  })

  it('does not activate a multi-touch gesture', async () => {
    await touch('touchstart', [point(), point(70, 32, 2)])
    await touch('touchend', [], [point()])
    expect(onLocation).not.toHaveBeenCalled()
  })

  it('does not activate when the touch ends outside the link', async () => {
    await touch('touchstart', [point(118)])
    await touch('touchend', [], [point(122)])
    expect(onLocation).not.toHaveBeenCalled()
  })
})
