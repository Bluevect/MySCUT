import { APP_ROUTE_PATHS } from './routePaths'

function normalizePathname(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const trimmed = withLeadingSlash.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function shouldShowBottomNavigation(pathname: string) {
  const normalized = normalizePathname(pathname)

  return !(
    normalized.startsWith('/mine/') ||
    normalized === APP_ROUTE_PATHS.coursesAddCoursesPage ||
    normalized === APP_ROUTE_PATHS.coursesAllCoursesPage
  )
}
