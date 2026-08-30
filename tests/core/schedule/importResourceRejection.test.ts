import { describe, expect, it, vi } from 'vitest'
import { decodeCompressedQmsText, encodeCompressedQmsText } from '../../../src/core/schedule/compressedQms'
import {
  COMPRESSED_QMS_MAX_BASE64_CHARACTERS,
  SCUT_PDF_MAX_BYTES,
  SCHEDULE_TEXT_MAX_BYTES,
} from '../../../src/core/schedule/importLimits'
import { parseQmsScheduleText } from '../../../src/core/schedule/importQms'
import { parseScutScheduleHtml } from '../../../src/core/schedule/importScutHtml'
import { extractScutSchedulePdf } from '../../../src/core/schedule/importScutPdf'
import { parseWakeupScheduleText } from '../../../src/core/schedule/importWakeup'

describe('schedule import early resource rejection', () => {
  it('rejects oversized text before the format parsers run', () => {
    const oversizedText = 'x'.repeat(SCHEDULE_TEXT_MAX_BYTES + 1)

    expect(() => parseWakeupScheduleText(oversizedText)).toThrow('WakeUp：内容大小超过 512 KiB 限制')
    expect(() => parseQmsScheduleText(oversizedText)).toThrow('QMS：内容大小超过 512 KiB 限制')
    expect(() => parseScutScheduleHtml(oversizedText, {
      fallbackSemesterStartDate: '2026-08-31',
    })).toThrow('华工教务 HTML：内容大小超过 512 KiB 限制')
  })

  it('rejects oversized compressed QMS input before Base64 or Zstd work', async () => {
    await expect(decodeCompressedQmsText(
      'A'.repeat(COMPRESSED_QMS_MAX_BASE64_CHARACTERS + 1),
    )).rejects.toThrow('128,000 个 Base64 字符限制')
  })

  it('rejects oversized QMS content immediately after decompression', async () => {
    const compressed = await encodeCompressedQmsText('x'.repeat(SCHEDULE_TEXT_MAX_BYTES + 1))

    expect(compressed.length).toBeLessThan(COMPRESSED_QMS_MAX_BASE64_CHARACTERS)
    await expect(decodeCompressedQmsText(compressed)).rejects.toThrow('压缩QMS解压内容超过 512 KiB 限制')
  })

  it('rejects an oversized PDF before reading its ArrayBuffer', async () => {
    const arrayBuffer = vi.fn()
    const oversizedPdf = {
      name: 'TEST-schedule.pdf',
      size: SCUT_PDF_MAX_BYTES + 1,
      arrayBuffer,
    } as unknown as File

    await expect(extractScutSchedulePdf(oversizedPdf)).rejects.toThrow('PDF 文件大小超过 8 MiB 限制')
    expect(arrayBuffer).not.toHaveBeenCalled()
  })
})
