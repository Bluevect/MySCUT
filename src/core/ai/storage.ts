import type { AiProviderId, OpenAiCompatibleSettings } from './types'

const AI_PROVIDER_STORAGE_KEY = 'aiProvider'
const OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY = 'aiOpenAiCompatibleSettings'
const LEGACY_BUILTIN_GATEWAY_PROVIDER_ID = ['builtin', 'Gateway'].join('')

// 当前实际可用的 provider 仅 OpenAI 兼容；localModel 未实现，不能被选为首选
const SUPPORTED_AI_PROVIDER_IDS: readonly AiProviderId[] = ['openaiCompatible']

export const OPENAI_API_KEY_LOCAL_ONLY_NOTICE = 'API Key 仅保存在本地，不会上传到应用服务器。'

export function isSupportedAiProvider(value: AiProviderId): boolean {
  return SUPPORTED_AI_PROVIDER_IDS.includes(value)
}

function isAiProviderId(value: unknown): value is AiProviderId {
  return value === 'openaiCompatible' || value === 'localModel'
}

function normalizeOpenAiCompatibleSettings(value: unknown): OpenAiCompatibleSettings | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const settings = value as {
    baseUrl?: unknown
    apiKey?: unknown
    defaultModel?: unknown
  }

  if (typeof settings.baseUrl !== 'string' || typeof settings.apiKey !== 'string') {
    return null
  }

  if (typeof settings.defaultModel !== 'undefined' && typeof settings.defaultModel !== 'string') {
    return null
  }

  const normalizedBaseUrl = settings.baseUrl.trim()
  const normalizedApiKey = settings.apiKey.trim()
  const normalizedDefaultModel = settings.defaultModel?.trim()

  return {
    baseUrl: normalizedBaseUrl,
    apiKey: normalizedApiKey,
    defaultModel: normalizedDefaultModel || undefined,
  }
}

export function getStoredAiProvider() {
  try {
    const value = localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
    if (value === LEGACY_BUILTIN_GATEWAY_PROVIDER_ID) {
      localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'openaiCompatible')
      return 'openaiCompatible'
    }

    return isAiProviderId(value) ? value : null
  } catch {
    return null
  }
}

export function getPreferredAiProvider() {
  const stored = getStoredAiProvider()
  return stored !== null && isSupportedAiProvider(stored) ? stored : 'openaiCompatible'
}

export function setStoredAiProvider(providerId: AiProviderId) {
  if (!isSupportedAiProvider(providerId)) {
    return false
  }

  try {
    localStorage.setItem(AI_PROVIDER_STORAGE_KEY, providerId)
    return true
  } catch {
    return false
  }
}

export function getOpenAiCompatibleSettings() {
  try {
    const value = localStorage.getItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY)
    if (!value) {
      return null
    }

    const parsed: unknown = JSON.parse(value)
    return normalizeOpenAiCompatibleSettings(parsed)
  } catch {
    return null
  }
}

export function setOpenAiCompatibleSettings(settings: OpenAiCompatibleSettings) {
  const normalized = normalizeOpenAiCompatibleSettings(settings)
  if (!normalized) {
    return false
  }

  try {
    localStorage.setItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}

export function clearOpenAiCompatibleSettings() {
  try {
    localStorage.removeItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
