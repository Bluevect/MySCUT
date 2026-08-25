// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPreferredAiProvider,
  getStoredAiProvider,
  isSupportedAiProvider,
  setStoredAiProvider,
} from '../../../src/core/ai/storage'

describe('AI provider storage migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('downgrades the removed builtin gateway preference to the supported provider', () => {
    localStorage.setItem('aiProvider', ['builtin', 'Gateway'].join(''))

    expect(getStoredAiProvider()).toBe('openaiCompatible')
    expect(getPreferredAiProvider()).toBe('openaiCompatible')
    expect(localStorage.getItem('aiProvider')).toBe('openaiCompatible')
  })

  it('keeps supported provider preferences unchanged', () => {
    localStorage.setItem('aiProvider', 'openaiCompatible')

    expect(getStoredAiProvider()).toBe('openaiCompatible')
    expect(localStorage.getItem('aiProvider')).toBe('openaiCompatible')
  })

  it('defaults to the supported provider when nothing is stored', () => {
    expect(getStoredAiProvider()).toBeNull()
    expect(getPreferredAiProvider()).toBe('openaiCompatible')
  })

  it('degrades a stored unavailable provider at read time without rewriting storage', () => {
    localStorage.setItem('aiProvider', 'localModel')

    expect(getStoredAiProvider()).toBe('localModel')
    expect(getPreferredAiProvider()).toBe('openaiCompatible')
    expect(localStorage.getItem('aiProvider')).toBe('localModel')
  })

  it('preserves unrelated settings while degrading an unavailable provider', () => {
    localStorage.setItem('aiProvider', 'localModel')
    localStorage.setItem(
      'aiOpenAiCompatibleSettings',
      JSON.stringify({ baseUrl: 'https://api.example.com/v1', apiKey: 'test-key' }),
    )

    expect(getPreferredAiProvider()).toBe('openaiCompatible')
    expect(localStorage.getItem('aiOpenAiCompatibleSettings')).toBe(
      JSON.stringify({ baseUrl: 'https://api.example.com/v1', apiKey: 'test-key' }),
    )
  })

  it('rejects persisting an unavailable provider', () => {
    expect(isSupportedAiProvider('localModel')).toBe(false)
    expect(isSupportedAiProvider('openaiCompatible')).toBe(true)

    expect(setStoredAiProvider('localModel')).toBe(false)
    expect(localStorage.getItem('aiProvider')).toBeNull()
  })
})
