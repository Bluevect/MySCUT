const KIB = 1024
const MIB = 1024 * KIB

export const SCHEDULE_TEXT_MAX_BYTES = 512 * KIB
export const COMPRESSED_QMS_MAX_BASE64_CHARACTERS = 128_000
export const SCUT_PDF_MAX_BYTES = 8 * MIB
export const SCUT_PDF_MAX_PAGES = 40

const textEncoder = new TextEncoder()

export function getUtf8ByteLength(text: string) {
  return textEncoder.encode(text).byteLength
}

export function assertScheduleByteLength(byteLength: number, sourceName: string) {
  if (byteLength > SCHEDULE_TEXT_MAX_BYTES) {
    throw new Error(`${sourceName}：内容大小超过 512 KiB 限制，请确认内容来自受支持的课表导出`)
  }
}

export function assertScheduleTextFileSize(file: Pick<File, 'size'>, sourceName: string) {
  if (file.size > SCHEDULE_TEXT_MAX_BYTES) {
    throw new Error(`${sourceName}：文件大小超过 512 KiB 限制，请确认选择的是课表导出文件`)
  }
}

export function assertScheduleTextByteLength(text: string, sourceName: string) {
  assertScheduleByteLength(getUtf8ByteLength(text), sourceName)
}

export function assertCompressedQmsInputLength(compressedQmsBase64: string) {
  if (compressedQmsBase64.length > COMPRESSED_QMS_MAX_BASE64_CHARACTERS) {
    throw new Error('压缩QMS内容超过 128,000 个 Base64 字符限制，请确认复制的是课表导出内容')
  }
}

export function assertCompressedQmsDecodedSize(byteLength: number) {
  if (byteLength > SCHEDULE_TEXT_MAX_BYTES) {
    throw new Error('压缩QMS解压内容超过 512 KiB 限制，请确认复制的是课表导出内容')
  }
}

export function assertScutPdfFileSize(file: Pick<File, 'size'>) {
  if (file.size > SCUT_PDF_MAX_BYTES) {
    throw new Error('PDF 文件大小超过 8 MiB 限制，请确认选择的是课表 PDF 导出文件')
  }
}

export function assertScutPdfPageCount(pageCount: number) {
  if (pageCount > SCUT_PDF_MAX_PAGES) {
    throw new Error('PDF 页数超过 40 页限制，请确认选择的是课表 PDF 导出文件')
  }
}
