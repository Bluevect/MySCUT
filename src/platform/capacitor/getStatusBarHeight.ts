import { StatusBar } from '@capacitor/status-bar'

export async function getStatusBarHeight() {
  const info = await StatusBar.getInfo()

  // Attribute 'height' actually exists, assert types
  const height = (info as any).height
  return height
}
