import { describe, expect, it } from 'vitest'
import {
  assertCompressedQmsDecodedSize,
  assertCompressedQmsInputLength,
  assertScheduleTextByteLength,
  assertScheduleTextFileSize,
  assertScutPdfFileSize,
  assertScutPdfPageCount,
  COMPRESSED_QMS_MAX_BASE64_CHARACTERS,
  SCUT_PDF_MAX_BYTES,
  SCUT_PDF_MAX_PAGES,
  SCHEDULE_TEXT_MAX_BYTES,
} from '../../../src/core/schedule/importLimits'

describe('schedule import resource limits', () => {
  it('accepts text file sizes below and at 512 KiB and rejects larger files', () => {
    expect(() => assertScheduleTextFileSize({ size: SCHEDULE_TEXT_MAX_BYTES - 1 }, 'WakeUp')).not.toThrow()
    expect(() => assertScheduleTextFileSize({ size: SCHEDULE_TEXT_MAX_BYTES }, 'QMS')).not.toThrow()
    expect(() => assertScheduleTextFileSize({ size: SCHEDULE_TEXT_MAX_BYTES + 1 }, '华工教务 HTML'))
      .toThrow('超过 512 KiB 限制')
  })

  it('measures direct and clipboard text by UTF-8 bytes', () => {
    expect(() => assertScheduleTextByteLength('a'.repeat(SCHEDULE_TEXT_MAX_BYTES - 1), '课表')).not.toThrow()
    expect(() => assertScheduleTextByteLength('a'.repeat(SCHEDULE_TEXT_MAX_BYTES), '课表')).not.toThrow()
    expect(() => assertScheduleTextByteLength('课'.repeat(Math.floor(SCHEDULE_TEXT_MAX_BYTES / 3) + 1), '课表'))
      .toThrow('超过 512 KiB 限制')
  })

  it('enforces compressed QMS input and decompressed byte boundaries', () => {
    expect(() => assertCompressedQmsInputLength('A'.repeat(COMPRESSED_QMS_MAX_BASE64_CHARACTERS - 1))).not.toThrow()
    expect(() => assertCompressedQmsInputLength('A'.repeat(COMPRESSED_QMS_MAX_BASE64_CHARACTERS))).not.toThrow()
    expect(() => assertCompressedQmsInputLength('A'.repeat(COMPRESSED_QMS_MAX_BASE64_CHARACTERS + 1)))
      .toThrow('128,000 个 Base64 字符限制')

    expect(() => assertCompressedQmsDecodedSize(SCHEDULE_TEXT_MAX_BYTES - 1)).not.toThrow()
    expect(() => assertCompressedQmsDecodedSize(SCHEDULE_TEXT_MAX_BYTES)).not.toThrow()
    expect(() => assertCompressedQmsDecodedSize(SCHEDULE_TEXT_MAX_BYTES + 1)).toThrow('超过 512 KiB 限制')
  })

  it('accepts PDF byte and page limits at the boundary and rejects larger inputs', () => {
    expect(() => assertScutPdfFileSize({ size: SCUT_PDF_MAX_BYTES - 1 })).not.toThrow()
    expect(() => assertScutPdfFileSize({ size: SCUT_PDF_MAX_BYTES })).not.toThrow()
    expect(() => assertScutPdfFileSize({ size: SCUT_PDF_MAX_BYTES + 1 })).toThrow('超过 8 MiB 限制')

    expect(() => assertScutPdfPageCount(SCUT_PDF_MAX_PAGES - 1)).not.toThrow()
    expect(() => assertScutPdfPageCount(SCUT_PDF_MAX_PAGES)).not.toThrow()
    expect(() => assertScutPdfPageCount(SCUT_PDF_MAX_PAGES + 1)).toThrow('超过 40 页限制')
  })
})
