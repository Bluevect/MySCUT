import { describe, expect, it } from 'vitest'
import { APP_ROUTE_PATHS } from '../../../src/app/routePaths'
import {
  APP_ROOT_PATH,
  PARENT_ROUTE_MAP,
  isAppRootPath,
  resolveBackPath,
} from '../../../src/core/navigation/appBack'

const ROUTE_PATHS_WITHOUT_BACK_TARGET = new Set<string>([
  APP_ROUTE_PATHS.root,
  APP_ROUTE_PATHS.notFound,
])
const KNOWN_APP_PATHS = Object.values(APP_ROUTE_PATHS).filter(
  (path) => !ROUTE_PATHS_WITHOUT_BACK_TARGET.has(path),
)
const KNOWN_APP_PATH_SET = new Set<string>(KNOWN_APP_PATHS)

function isBackRouteCovered(pathname: string) {
  return (
    pathname === APP_ROOT_PATH || Object.prototype.hasOwnProperty.call(PARENT_ROUTE_MAP, pathname)
  )
}

describe('resolveBackPath', () => {
  it('keeps the root page as the back target', () => {
    expect(resolveBackPath('/courses')).toBe(APP_ROOT_PATH)
  })

  it('returns tab pages to the root page', () => {
    expect(resolveBackPath('/manual')).toBe(APP_ROOT_PATH)
    expect(resolveBackPath('/mine')).toBe(APP_ROOT_PATH)
  })

  it('walks sub pages up one level', () => {
    expect(resolveBackPath('/mine/schedule-settings')).toBe('/mine')
    expect(resolveBackPath('/mine/schedule-intersection')).toBe('/mine')
    expect(resolveBackPath('/mine/ai-settings')).toBe('/mine')
    expect(resolveBackPath('/mine/global-settings')).toBe('/mine')
    expect(resolveBackPath('/mine/faq')).toBe('/mine')
    expect(resolveBackPath('/mine/more')).toBe('/mine')
    expect(resolveBackPath('/mine/import-scut-pdf')).toBe('/mine/schedule-settings')
    expect(resolveBackPath('/mine/import-scut-jw')).toBe('/mine/schedule-settings')
    expect(resolveBackPath('/mine/import-scut-jw-webview')).toBe('/mine/schedule-settings')
  })

  it('returns the intersection settings page for the temporary schedule preview', () => {
    expect(resolveBackPath('/courses/intersection-preview')).toBe('/mine/schedule-intersection')
  })

  it('returns course editing pages to the all-courses page', () => {
    expect(resolveBackPath('/courses/edit-course/schedule-1/2/lesson-1')).toBe(
      '/courses/all-courses',
    )
  })

  it('falls back to the root page for unknown paths', () => {
    expect(resolveBackPath('/')).toBe(APP_ROOT_PATH)
    expect(resolveBackPath('/unknown-page')).toBe(APP_ROOT_PATH)
    expect(resolveBackPath('')).toBe(APP_ROOT_PATH)
  })

  it('ignores trailing slashes', () => {
    expect(resolveBackPath('/mine/faq/')).toBe('/mine')
    expect(resolveBackPath('/courses/')).toBe(APP_ROOT_PATH)
  })

  it('never resolves a non root path to itself, so back always moves a level', () => {
    for (const path of KNOWN_APP_PATHS.filter((candidate) => candidate !== APP_ROOT_PATH)) {
      expect(resolveBackPath(path)).not.toBe(path)
    }
  })
})

describe('isAppRootPath', () => {
  it('detects only the root page', () => {
    expect(isAppRootPath('/courses')).toBe(true)
    expect(isAppRootPath('/courses/')).toBe(true)
  })

  it('treats every other page as having a level to go back to', () => {
    for (const path of KNOWN_APP_PATHS.filter((candidate) => candidate !== APP_ROOT_PATH)) {
      expect(isAppRootPath(path)).toBe(false)
    }
  })
})

describe('back route coverage', () => {
  it('covers every app route and returns only known routes', () => {
    const uncoveredPaths = KNOWN_APP_PATHS.filter((path) => !isBackRouteCovered(path))
    const invalidTargets = KNOWN_APP_PATHS.filter((path) => !isAppRootPath(path))
      .map((path) => ({ path, target: resolveBackPath(path) }))
      .filter(({ target }) => !KNOWN_APP_PATH_SET.has(target))

    expect(uncoveredPaths).toEqual([])
    expect(invalidTargets).toEqual([])
  })
})
