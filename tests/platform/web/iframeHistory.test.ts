// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { goBackInIframe } from '../../../src/platform/web/iframeHistory'

type NavigationStub = {
  canGoBack: boolean
  currentEntry: { key: string } | null
  back: ReturnType<typeof vi.fn>
}

function createFrame(options: { canGoBack: boolean; onBack?: (navigation: NavigationStub) => void }) {
  const navigation: NavigationStub = {
    canGoBack: options.canGoBack,
    currentEntry: { key: 'entry-1' },
    back: vi.fn(async () => {
      options.onBack?.(navigation)
    }),
  }

  return {
    frame: { contentWindow: { navigation } } as unknown as HTMLIFrameElement,
    navigation,
  }
}

describe('goBackInIframe', () => {
  it('ignores a missing frame', async () => {
    await expect(goBackInIframe(null)).resolves.toBe(false)
  })

  it('ignores frames without the navigation api', async () => {
    const frame = { contentWindow: {} } as unknown as HTMLIFrameElement

    await expect(goBackInIframe(frame)).resolves.toBe(false)
  })

  it('ignores frames that cannot go back on their own', async () => {
    const { frame, navigation } = createFrame({ canGoBack: false })

    await expect(goBackInIframe(frame)).resolves.toBe(false)
    expect(navigation.back).not.toHaveBeenCalled()
  })

  it('claims the press when the frame moves to another entry', async () => {
    const { frame, navigation } = createFrame({
      canGoBack: true,
      onBack: (stub) => {
        stub.currentEntry = { key: 'entry-2' }
      },
    })

    await expect(goBackInIframe(frame)).resolves.toBe(true)
    expect(navigation.back).toHaveBeenCalledOnce()
  })

  it('leaves the press to the app when the frame entry does not change', async () => {
    const { frame, navigation } = createFrame({ canGoBack: true })

    await expect(goBackInIframe(frame)).resolves.toBe(false)
    expect(navigation.back).toHaveBeenCalledOnce()
  })

  it('claims the press when an aborted traversal still moved the frame', async () => {
    const navigation: NavigationStub = {
      canGoBack: true,
      currentEntry: { key: 'entry-1' },
      back: vi.fn(async () => {
        navigation.currentEntry = { key: 'entry-2' }
        throw new Error('traversal aborted')
      }),
    }
    const frame = { contentWindow: { navigation } } as unknown as HTMLIFrameElement

    await expect(goBackInIframe(frame)).resolves.toBe(true)
  })

  it('ignores frames whose window is not readable', async () => {
    const frame = {
      get contentWindow(): never {
        throw new Error('cross origin')
      },
    } as unknown as HTMLIFrameElement

    await expect(goBackInIframe(frame)).resolves.toBe(false)
  })
})
