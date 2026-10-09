import { describe, expect, it, vi } from 'vitest'
import {
  dismissTopBackOverlay,
  registerBackDismiss,
} from '../../../src/core/navigation/backDismiss'

describe('back dismiss registry', () => {
  it('reports nothing to dismiss when no overlay is registered', () => {
    expect(dismissTopBackOverlay()).toBe(false)
  })

  it('dismisses the most recently opened overlay first', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unregisterFirst = registerBackDismiss(first)
    const unregisterSecond = registerBackDismiss(second)

    expect(dismissTopBackOverlay()).toBe(true)
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()

    expect(dismissTopBackOverlay()).toBe(true)
    expect(first).toHaveBeenCalledOnce()

    unregisterFirst()
    unregisterSecond()
  })

  it('ignores overlays that already unregistered themselves', () => {
    const dismiss = vi.fn()
    const unregister = registerBackDismiss(dismiss)

    unregister()

    expect(dismissTopBackOverlay()).toBe(false)
    expect(dismiss).not.toHaveBeenCalled()
  })

  it('does not dismiss the same overlay twice', () => {
    const dismiss = vi.fn()
    const unregister = registerBackDismiss(dismiss)

    expect(dismissTopBackOverlay()).toBe(true)
    expect(dismissTopBackOverlay()).toBe(false)
    expect(dismiss).toHaveBeenCalledOnce()

    unregister()
  })
})
