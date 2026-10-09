import { StatusBar, type StatusBarInfo } from '@capacitor/status-bar'

type StatusBarInfoWithHeight = StatusBarInfo & {
  height: number
}

export async function getStatusBarHeight() {
  const info = await StatusBar.getInfo()
  const height = (info as StatusBarInfoWithHeight).height
  return height
}
