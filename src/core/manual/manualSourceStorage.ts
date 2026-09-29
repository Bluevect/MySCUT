const MANUAL_SOURCE_STORAGE_KEY = 'manualUseLocal'
const MANUAL_RELOAD_STORAGE_KEY = 'manualReload'

export const LOCAL_MANUAL_URL = '/docs/index.html'
export const REMOTE_MANUAL_URL = 'https://manual.xn--xkrsa0ti6rf4cf98d.com/'

let reloadManualEnabledStartup: boolean | null = null

export function getUseLocalManual() {
  try {
    return localStorage.getItem(MANUAL_SOURCE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setUseLocalManual(enabled: boolean) {
  try {
    localStorage.setItem(MANUAL_SOURCE_STORAGE_KEY, enabled ? '1' : '0')
    return true
  } catch {
    return false
  }
}

export function getReloadManualEnabled() {
  try {
    return localStorage.getItem(MANUAL_RELOAD_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setReloadManualEnabled(enabled: boolean) {
  try {
    localStorage.setItem(MANUAL_RELOAD_STORAGE_KEY, enabled ? '1' : '0')
    return true
  } catch {
    return false
  }
}

export function getReloadManualEnabledStartup(): boolean {
  if (reloadManualEnabledStartup === null) {
    reloadManualEnabledStartup = getReloadManualEnabled()
  }
  return reloadManualEnabledStartup
}
