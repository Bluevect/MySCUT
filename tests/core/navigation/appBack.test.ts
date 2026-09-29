import { describe, expect, it } from 'vitest'
import { APP_ROOT_PATH, isAppRootPath, resolveBackPath } from '../../../src/core/navigation/appBack'

const KNOWN_APP_PATHS = [
  '/courses',
  '/courses/intersection-preview',
  '/manual',
  '/mine',
  '/mine/schedule-settings',
  '/mine/schedule-intersection',
  '/mine/ai-settings',
  '/mine/import-scut-pdf',
  '/mine/import-scut-jw',
  '/mine/import-scut-jw-webview',
  '/mine/global-settings',
  '/mine/faq',
  '/mine/more',
]

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
