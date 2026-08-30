import { StatusBar, Style } from "@capacitor/status-bar"

export async function setWebViewStatusBar() {
  await StatusBar.setBackgroundColor({ color: '#ffffff' })
  await StatusBar.setStyle({ style: Style.Light })
  await StatusBar.setOverlaysWebView({ overlay: false })
}

export async function restoreWebViewStatusBar() {
  StatusBar.setOverlaysWebView({ overlay: true });
}
