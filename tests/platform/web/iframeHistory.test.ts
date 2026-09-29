// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIframeHistory } from '../../../src/platform/web/iframeHistory'

const historyLength = { value: 0 }

beforeEach(() => {
  historyLength.value = 0
  Object.defineProperty(window.history, 'length', {
    configurable: true,
    get: () => historyLength.value,
  })
  vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (window.history as unknown as Record<string, unknown>).length
})

describe('createIframeHistory', () => {
  it('leaves the press to the app while the frame has no entries of its own', () => {
    const iframeHistory = createIframeHistory()

    expect(iframeHistory.goBack()).toBe(false)
    expect(window.history.back).not.toHaveBeenCalled()
  })

  it('claims the press once an iframe navigation added an entry', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 1

    expect(iframeHistory.goBack()).toBe(true)
    expect(window.history.back).toHaveBeenCalledOnce()
  })

  it('walks one frame entry per press and stops at the frame root', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 2

    expect(iframeHistory.goBack()).toBe(true)
    expect(iframeHistory.goBack()).toBe(true)
    expect(iframeHistory.goBack()).toBe(false)
    expect(window.history.back).toHaveBeenCalledTimes(2)
  })

  it('forgets frame entries once the app has navigated again', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 2
    iframeHistory.reset()

    expect(iframeHistory.goBack()).toBe(false)
  })

  it('forgets frame entries once the frame document is replaced', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 1
    historyLength.value += 1
    iframeHistory.reset()
    historyLength.value += 1

    expect(iframeHistory.goBack()).toBe(true)
    expect(iframeHistory.goBack()).toBe(false)
  })
})
