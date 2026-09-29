export const APP_ROOT_PATH = '/courses'

// Native back walks this fixed hierarchy, not browser history; unknown paths fall back to the root
const PARENT_ROUTE_MAP: Record<string, string> = {
  '/manual': APP_ROOT_PATH,
  '/mine': APP_ROOT_PATH,
  '/courses/intersection-preview': '/mine/schedule-intersection',
  '/mine/schedule-settings': '/mine',
  '/mine/schedule-intersection': '/mine',
  '/mine/ai-settings': '/mine',
  '/mine/import-scut-pdf': '/mine/schedule-settings',
  '/mine/import-scut-jw': '/mine/schedule-settings',
  '/mine/import-scut-jw-webview': '/mine/schedule-settings',
  '/mine/global-settings': '/mine',
  '/mine/faq': '/mine',
  '/mine/more': '/mine',
}

function normalizePathname(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const trimmed = withLeadingSlash.replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}

// The root page maps to itself, so isAppRootPath decides when the app should exit
export function resolveBackPath(pathname: string) {
  const normalized = normalizePathname(pathname)

  return PARENT_ROUTE_MAP[normalized] ?? APP_ROOT_PATH
}

// Already at the root page, so native builds should exit the app
export function isAppRootPath(pathname: string) {
  return normalizePathname(pathname) === APP_ROOT_PATH
}
