import { StatusBar } from '@capacitor/status-bar'

// Unused, might be useful for later dev
export async function getStatusBarHeight() {
  const info = await StatusBar.getInfo()

  // Attribute 'height' actually exists, assert types
  const height = (info as any).height
  return height
}
