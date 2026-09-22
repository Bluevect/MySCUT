import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type ApkDownloadProgress = {
  receivedBytes: number
  totalBytes: number | null
}

export type ApkDownloadResult = {
  path: string
  cached: boolean
}

export type ApkInstallResult = {
  status: 'install-started' | 'needs-permission'
}

type ApkUpdaterPlugin = {
  download(options: {
    url: string
    expectedSha256?: string
    expectedSize?: number
  }): Promise<ApkDownloadResult>
  install(options: { path: string }): Promise<ApkInstallResult>
  addListener(
    eventName: 'apkDownloadProgress',
    listener: (progress: ApkDownloadProgress) => void,
  ): Promise<PluginListenerHandle>
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater')

export function supportsInAppApkUpdate() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}
