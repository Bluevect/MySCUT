import { Capacitor, registerPlugin } from '@capacitor/core'
import { createIframeHistory, createIndexedIframeHistory } from '../web/iframeHistory'

type WebViewHistoryPlugin = {
  getPosition: () => Promise<{ index: number }>
  goBack: (options: { fromIndex: number; toIndex: number }) => Promise<{ index: number }>
}

const WebViewHistory = registerPlugin<WebViewHistoryPlugin>('WebViewHistory')

export function createManualHistory() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return createIframeHistory()
  }

  return createIndexedIframeHistory({
    getIndex: async () => (await WebViewHistory.getPosition()).index,
    goBack: async (fromIndex, toIndex) =>
      (await WebViewHistory.goBack({ fromIndex, toIndex })).index,
  })
}
