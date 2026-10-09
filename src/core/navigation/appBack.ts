export const APP_ROOT_PATH = '/courses'

// Native back walks this fixed hierarchy, not browser history; unknown paths fall back to the root
export const PARENT_ROUTE_MAP: Readonly<Record<string, string>> = {
  '/manual': APP_ROOT_PATH,
  '/mine': APP_ROOT_PATH,
  '/courses/intersection-preview': '/mine/schedule-intersection',
  '/courses/add-courses': APP_ROOT_PATH,
  '/courses/all-courses': APP_ROOT_PATH,
  '/courses/edit-course/:scheduleId/:courseId/:instanceId': '/courses/all-courses',
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

function matchesParameterizedPath(pattern: string, pathname: string) {
  const patternSegments = pattern.split('/')
  const pathSegments = pathname.split('/')

  return (
    patternSegments.length === pathSegments.length &&
    patternSegments.every(
      (segment, index) => segment.startsWith(':') || segment === pathSegments[index],
    )
  )
}

// The root page maps to itself, so isAppRootPath decides when the app should exit
export function resolveBackPath(pathname: string) {
  const normalized = normalizePathname(pathname)

  const directParent = PARENT_ROUTE_MAP[normalized]
  if (directParent) {
    return directParent
  }

  const parameterizedParent = Object.entries(PARENT_ROUTE_MAP).find(
    ([pattern]) => pattern.includes('/:') && matchesParameterizedPath(pattern, normalized),
  )?.[1]

  return parameterizedParent ?? APP_ROOT_PATH
}

// Already at the root page, so native builds should exit the app
export function isAppRootPath(pathname: string) {
  return normalizePathname(pathname) === APP_ROOT_PATH
}
