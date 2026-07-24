import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { ResolvedGlobalThemeMode } from '../../core/theme/types'

/**
 * 读取当前 <html> 上已生效的 --bg-page（由 applyGlobalThemeVariables 写入）。
 * 在 PWA / 原生状态栏背景色 / theme-color 中统一使用，保证和页面背景一致。
 */
function getResolvedBgPage(): string {
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-page')
      .trim()
    if (value) {
      return value
    }
  } catch {
    // document 不可用时静默回退
  }
  return ''
}

/**
 * 更新 <meta name="theme-color">，控制 PWA／浏览器 chrome 的任务栏／地址栏染色。
 */
function updatePwaThemeColor(color: string) {
  if (typeof document === 'undefined') {
    return
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', color)
  }
}

/**
 * 在主题切换时同步状态栏相关 UI：
 *   - 原生 Android／iOS：状态栏文字颜色（暗色/亮色）
 *   - 原生 Android：状态栏背景色与 --bg-page 一致
 *   - PWA/Web：<meta name="theme-color"> 同步 --bg-page
 *
 * 必须在 applyGlobalThemeVariables() 之后调用，确保 CSS 变量已写入。
 */
export async function syncStatusBarStyleForTheme(resolvedMode: ResolvedGlobalThemeMode) {
  // 1. 原生平台：状态栏文字颜色
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({
        style: resolvedMode === 'light' ? Style.Light : Style.Dark,
      })
    } catch {
      // 插件不可用时静默忽略
    }
  }

  // 2. 读取当前页面的背景色（由主题套装 + 模式决定）
  const bgPage = getResolvedBgPage()
  const fallbackColor = resolvedMode === 'dark' ? '#12161d' : '#f5f6fa'
  const resolvedColor = bgPage || fallbackColor

  // 3. PWA/Web：更新 theme-color 使系统 chrome 与页面背景一致
  updatePwaThemeColor(resolvedColor)

  // 4. Android：状态栏背景色与页面背景一致（非 overlays 模式下生效，Android 15+ 不可用）
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await StatusBar.setBackgroundColor({ color: resolvedColor })
    } catch {
      // Android 15+ 不支持 setBackgroundColor，静默忽略
    }
  }
}
