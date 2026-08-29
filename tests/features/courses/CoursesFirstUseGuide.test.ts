import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CoursesFirstUseGuide, {
  shouldShowCoursesFirstUseGuide,
} from '../../../src/features/courses/CoursesFirstUseGuide'

describe('courses first-use guide', () => {
  it('is shown only for an empty schedule library outside intersection preview', () => {
    expect(shouldShowCoursesFirstUseGuide(0, false)).toBe(true)
    expect(shouldShowCoursesFirstUseGuide(1, false)).toBe(false)
    expect(shouldShowCoursesFirstUseGuide(0, true)).toBe(false)
  })

  it('renders the guide heading, capabilities, and import action', () => {
    const markup = renderToStaticMarkup(createElement(CoursesFirstUseGuide, { onImport: () => undefined }))

    expect(markup).toContain('<h1')
    expect(markup).toContain('先导入一份课表')
    expect(markup).toContain('支持多种课表来源')
    expect(markup).toContain('数据默认留在当前设备')
    expect(markup).toContain('清晰查看每周课程')
    expect(markup).toContain('导入课表')
    expect(markup).toContain('/icons/icon-192.png')
  })
})
