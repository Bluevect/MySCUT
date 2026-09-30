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
  vi.spyOn(window.history, 'go').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (window.history as unknown as Record<string, unknown>).length
})

describe('createIframeHistory', () => {
  it('leaves the press to the app while the frame has no entries of its own', () => {
    const iframeHistory = createIframeHistory()

    expect(iframeHistory.goBack()).toBe(false)
    expect(window.history.go).not.toHaveBeenCalled()
  })

  it('claims the press once an iframe navigation added an entry', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 1

    expect(iframeHistory.goBack()).toBe(true)
    expect(window.history.go).toHaveBeenCalledWith(-1)
  })

  it('walks one frame entry per press and stops at the frame root', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 2

    expect(iframeHistory.goBack()).toBe(true)
    expect(iframeHistory.goBack()).toBe(true)
    expect(iframeHistory.goBack()).toBe(false)
    expect(window.history.go).toHaveBeenNthCalledWith(1, -1)
    expect(window.history.go).toHaveBeenNthCalledWith(2, -1)
  })

  it('keeps frame entries across app pushes and skips tab entries on back', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 2
    historyLength.value += 1
    iframeHistory.noteAppPush()
    historyLength.value += 1
    iframeHistory.noteAppPush()

    expect(iframeHistory.goBack()).toBe(true)
    expect(window.history.go).toHaveBeenNthCalledWith(1, -3)
    expect(iframeHistory.goBack()).toBe(true)
    expect(window.history.go).toHaveBeenNthCalledWith(2, -1)
    expect(iframeHistory.goBack()).toBe(false)
  })

  it('uses a new iframe entry as the latest frame position', () => {
    const iframeHistory = createIframeHistory()
    historyLength.value += 2
    historyLength.value += 1
    iframeHistory.noteAppPush()
    historyLength.value += 1
    iframeHistory.noteAppPush()
    historyLength.value += 1

    expect(iframeHistory.goBack()).toBe(true)
    expect(window.history.go).toHaveBeenCalledWith(-1)
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
