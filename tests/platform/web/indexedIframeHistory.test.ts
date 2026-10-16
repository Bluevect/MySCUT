import { describe, expect, it, vi } from 'vitest'
import { createIndexedIframeHistory } from '../../../src/platform/web/iframeHistory'

function setup() {
  let index = 1
  let length = 2
  const goBack = vi.fn(async (_from: number, to: number) => {
    index = to
    return index
  })
  const history = createIndexedIframeHistory({
    getIndex: async () => index,
    goBack,
  })
  const push = () => {
    index += 1
    length = index + 1
  }
  return { history, push, goBack, getLength: () => length }
}

describe('indexed iframe history', () => {
  it('returns to the manual on every repeated article visit even when total history length is unchanged', async () => {
    const { history, push, goBack, getLength } = setup()
    await expect(history.goBack()).resolves.toBe(false)
    for (let visit = 0; visit < 5; visit += 1) {
      push()
      expect(getLength()).toBe(3)
      await expect(history.goBack()).resolves.toBe(true)
      expect(getLength()).toBe(3)
      await expect(history.goBack()).resolves.toBe(false)
    }
    expect(goBack).toHaveBeenCalledTimes(5)
    expect(goBack).toHaveBeenLastCalledWith(2, 1)
  })

  it('returns through nested articles and replaces a forward branch correctly', async () => {
    const { history, push, goBack } = setup()
    push()
    push()
    await expect(history.goBack()).resolves.toBe(true)
    push()
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
    expect(goBack.mock.calls).toEqual([
      [3, 2],
      [3, 2],
      [2, 1],
    ])
  })

  it('skips app tab entries while preserving the previous manual page', async () => {
    const { history, push, goBack } = setup()
    push()
    push()
    push()
    history.noteAppPush()
    push()
    history.noteAppPush()
    await expect(history.goBack()).resolves.toBe(true)
    expect(goBack).toHaveBeenLastCalledWith(5, 2)
    push()
    await expect(history.goBack()).resolves.toBe(true)
    expect(goBack).toHaveBeenLastCalledWith(3, 2)
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
  })

  it('walks a new article before skipping earlier tab switches', async () => {
    const { history, push, goBack } = setup()
    push()
    push()
    history.noteAppPush()
    push()
    history.noteAppPush()
    push()
    await expect(history.goBack()).resolves.toBe(true)
    expect(goBack).toHaveBeenLastCalledWith(5, 4)
    await expect(history.goBack()).resolves.toBe(true)
    expect(goBack).toHaveBeenLastCalledWith(4, 1)
    await expect(history.goBack()).resolves.toBe(false)
  })

  it('does not mistake root-level app tab switches for manual history', async () => {
    const { history, push, goBack } = setup()
    push()
    history.noteAppPush()
    push()
    history.noteAppPush()
    await expect(history.goBack()).resolves.toBe(false)
    expect(goBack).not.toHaveBeenCalled()
    push()
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
  })

  it('resets the origin when the frame source changes', async () => {
    const { history, push } = setup()
    push()
    history.reset()
    await expect(history.goBack()).resolves.toBe(false)
    push()
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
  })

  it('coalesces back presses until the native traversal has completed', async () => {
    let index = 1
    let finish: (index: number) => void = () => {}
    const goBack = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve
        }),
    )
    const history = createIndexedIframeHistory({ getIndex: async () => index, goBack })
    await expect(history.goBack()).resolves.toBe(false)
    index = 2
    const first = history.goBack()
    const second = history.goBack()
    await vi.waitFor(() => expect(goBack).toHaveBeenCalledOnce())
    index = 1
    finish(1)
    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
  })

  it('consumes a stale native request instead of falling back to the courses tab', async () => {
    let index = 1
    const history = createIndexedIframeHistory({
      getIndex: async () => index,
      goBack: async () => 3,
    })
    await expect(history.goBack()).resolves.toBe(false)
    index = 2
    await expect(history.goBack()).resolves.toBe(true)
  })

  it('does not start a native traversal after the user switches away during the index read', async () => {
    let release: (index: number) => void = () => {}
    const getIndex = vi.fn(async () => 1)
    const goBack = vi.fn(async (_from: number, to: number) => to)
    const history = createIndexedIframeHistory({ getIndex, goBack })
    await expect(history.goBack()).resolves.toBe(false)
    getIndex.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    let active = true
    const back = history.goBack(() => active)
    await vi.waitFor(() => expect(getIndex).toHaveBeenCalledTimes(3))
    active = false
    release(2)
    await expect(back).resolves.toBe(true)
    expect(goBack).not.toHaveBeenCalled()
  })

  it('allows a retry after a failed native traversal without losing the current frame history', async () => {
    const { history, push, goBack } = setup()
    push()
    goBack.mockRejectedValueOnce(new Error('Native traversal timed out'))
    await expect(history.goBack()).rejects.toThrow('Native traversal timed out')
    await expect(history.goBack()).resolves.toBe(true)
    await expect(history.goBack()).resolves.toBe(false)
  })
})
