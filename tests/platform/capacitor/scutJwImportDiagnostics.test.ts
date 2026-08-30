import { describe, expect, it } from 'vitest'
import { buildScutJwImportDiagnostic } from '../../../src/platform/capacitor/scutJwImportDiagnostics'

describe('buildScutJwImportDiagnostic', () => {
  it('keeps only the sanitized origin and approved aggregate fields', () => {
    const diagnostic = buildScutJwImportDiagnostic({
      stage: 'parse-completed',
      targetUrl: 'https://student:secret@jw.example.edu.cn/private/schedule?token=TEST-TOKEN#details',
      status: 200,
      responseLength: 4096,
      courseCount: 8,
      lessonCount: 12,
    })

    expect(diagnostic).toEqual({
      stage: 'parse-completed',
      origin: 'https://jw.example.edu.cn',
      status: 200,
      responseLength: 4096,
      courseCount: 8,
      lessonCount: 12,
    })
    expect(JSON.stringify(diagnostic)).not.toContain('secret')
    expect(JSON.stringify(diagnostic)).not.toContain('TEST-TOKEN')
    expect(JSON.stringify(diagnostic)).not.toContain('/private/schedule')
  })

  it('omits invalid or unsupported target URLs', () => {
    expect(buildScutJwImportDiagnostic({
      stage: 'opening',
      targetUrl: 'javascript:alert(1)',
    })).toEqual({ stage: 'opening' })
  })
})
