import { describe, expect, it } from 'vitest'
import { shouldShowBottomNavigation } from '../../src/app/bottomNavigation'

describe('shouldShowBottomNavigation', () => {
  it.each([
    '/courses/add-courses',
    '/courses/all-courses',
    '/mine/schedule-settings',
  ])('hides bottom navigation on %s', (pathname) => {
    expect(shouldShowBottomNavigation(pathname)).toBe(false)
  })

  it.each([
    '/courses',
    '/manual',
    '/mine',
  ])('shows bottom navigation on %s', (pathname) => {
    expect(shouldShowBottomNavigation(pathname)).toBe(true)
  })

  it('normalizes trailing slashes before checking the route', () => {
    expect(shouldShowBottomNavigation('/courses/add-courses/')).toBe(false)
  })
})
