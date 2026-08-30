import {
  assertScutPdfFileSize,
  assertScutPdfPageCount,
} from './importLimits'

type PdfjsRuntime = {
  getDocument: (typeof import('pdfjs-dist'))['getDocument']
  version: string
}

let pdfjsRuntimePromise: Promise<PdfjsRuntime> | null = null

async function getPdfjsRuntime() {
  if (!pdfjsRuntimePromise) {
    pdfjsRuntimePromise = (async () => {
      const [pdfjs, workerModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.mjs?url'),
      ])

      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default

      return {
        getDocument: pdfjs.getDocument,
        version: pdfjs.version,
      }
    })()
  }

  return pdfjsRuntimePromise
}

function resolvePdfAssetBaseUrl(pdfjsVersion: string) {
  return __PDF_LOCAL_CMAP_ENABLED__
    ? `${import.meta.env.BASE_URL}pdfjs/`
    : `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/`
}

type PdfJsTextItem = {
  str: string
  dir: string
  transform: number[]
  width: number
  height: number
  fontName: string
  hasEOL?: boolean
}

export type ExtractedPdfTextItem = {
  index: number
  text: string
  dir: string
  fontName: string
  transform: number[]
  width: number
  height: number
  x: number
  y: number
  top: number
  hasEOL: boolean
}

export type ExtractedPdfPage = {
  pageNumber: number
  rotation: number
  width: number
  height: number
  items: ExtractedPdfTextItem[]
}

export type ExtractedSchedulePdf = {
  meta: {
    sourceFileName: string
    byteLength: number
    parsedAt: string
    pageCount: number
    pdfjsVersion: string
  }
  pages: ExtractedPdfPage[]
}

export const SCUT_PDF_FIXED_LAYOUT = {
  id: 'scut-student-timetable-v1',
  page: {
    width: 842,
    height: 595,
    tolerance: 18,
  },
  table: {
    left: 28,
    top: 132,
    nodeColumnWidth: 58,
    dayColumnWidth: 104,
    headerHeight: 25,
    nodeHeight: 34,
    nodeCount: 12,
  },
} as const

export type ScutPdfWeekRange = {
  startWeek: number
  endWeek: number
  weekStep: number
}

export type ScutPdfLessonContract = {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startNode: number
  endNode: number
  courseName: string
  weekExpression: string
  weekRanges: ScutPdfWeekRange[]
  teacher: string
  room: string
  credit: number
}

export type ScutSchedulePdfContract = {
  version: 1
  layout: typeof SCUT_PDF_FIXED_LAYOUT.id
  title: string
  academicYear: string
  semester: number
  studentIdentifier: string
  campus: string
  scheduleIdentifier: string
  lessons: ScutPdfLessonContract[]
}

type PositionedTextLine = {
  top: number
  text: string
}

const weekdayLabels = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'] as const
const weekdayAliases = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

function createFormatError(detail: string) {
  return new Error(`不支持的华工课表 PDF 格式：${detail}`)
}

function decodeUtf16BeFallback(text: string) {
  const shouldTryDecode = text.length % 2 === 0
    && Array.from(text).every((character) => character.charCodeAt(0) <= 0xff)
    && Array.from(text).some((character) => {
      const code = character.charCodeAt(0)
      return code < 0x20 || code >= 0x7f
    })

  if (!shouldTryDecode) {
    return text
  }

  let decoded = ''
  for (let index = 0; index < text.length; index += 2) {
    decoded += String.fromCharCode((text.charCodeAt(index) << 8) | text.charCodeAt(index + 1))
  }

  return /[\u3400-\u9fff：]/.test(decoded) ? decoded : text
}

function normalizeExtractedText(text: string) {
  return decodeUtf16BeFallback(text).replace(/\s+/g, ' ').trim()
}

function groupPositionedLines(items: ExtractedPdfTextItem[]) {
  const groups: Array<{ top: number; items: ExtractedPdfTextItem[] }> = []

  items.forEach((item) => {
    const text = normalizeExtractedText(item.text)
    if (!text) {
      return
    }

    const matchingGroup = groups.find((group) => Math.abs(group.top - item.top) <= 2)
    if (matchingGroup) {
      matchingGroup.items.push({ ...item, text })
      return
    }

    groups.push({
      top: item.top,
      items: [{ ...item, text }],
    })
  })

  return groups
    .sort((left, right) => left.top - right.top)
    .map<PositionedTextLine>((group) => ({
      top: group.top,
      text: group.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
}

function parseMetadataLine(page: ExtractedPdfPage) {
  const metadataText = groupPositionedLines(page.items.filter((item) => item.top < SCUT_PDF_FIXED_LAYOUT.table.top))
    .map((line) => line.text)
    .join(' ')
  const combinedTerm = metadataText.match(/(\d{4}-\d{4})学年第(\d+)学期/)

  const academicYear = combinedTerm?.[1]
    ?? metadataText.match(/学年学期\s*[:：]\s*(\d{4}-\d{4})/)?.[1]
    ?? metadataText.match(/ACADEMIC-YEAR\s*:\s*(\d{4}-\d{4})/i)?.[1]
  const semesterText = combinedTerm?.[2]
    ?? metadataText.match(/(?:^|\s)学期\s*[:：]\s*(\d+)/)?.[1]
    ?? metadataText.match(/SEMESTER\s*:\s*(\d+)/i)?.[1]
  const studentIdentifier = metadataText.match(/学号\s*[:：]\s*([^\s]+)/)?.[1]
    ?? metadataText.match(/STUDENT-ID\s*:\s*([^\s]+)/i)?.[1]
  const campus = metadataText.match(/校区\s*[:：]\s*([^\s]+)/)?.[1]
    ?? metadataText.match(/CAMPUS\s*:\s*([^\s]+)/i)?.[1]
  const scheduleIdentifier = metadataText.match(/课表编号\s*[:：]\s*([^\s]+)/)?.[1]
    ?? metadataText.match(/SCHEDULE-ID\s*:\s*([^\s]+)/i)?.[1]

  if (!academicYear || !semesterText || !studentIdentifier || !campus || !scheduleIdentifier) {
    throw createFormatError('缺少学年学期、学号、校区或课表编号等固定页眉字段')
  }

  const semester = Number.parseInt(semesterText, 10)
  if (!Number.isInteger(semester) || semester < 1 || semester > 3) {
    throw createFormatError('学期字段不在支持范围内')
  }

  return {
    academicYear,
    semester,
    studentIdentifier,
    campus,
    scheduleIdentifier,
  }
}

function parseWeekRanges(expression: string) {
  const normalized = expression
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/，/g, ',')
    .replace(/周/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
  const ranges = normalized.split(',').map((part) => {
    const match = part.match(/^(\d+)(?:-(\d+))?(?:\((ODD|EVEN|单|双)\)|\/(\d+))?$/)
    if (!match) {
      throw createFormatError(`无法识别周次“${expression}”`)
    }

    const startWeek = Number.parseInt(match[1], 10)
    const endWeek = Number.parseInt(match[2] ?? match[1], 10)
    const parity = match[3]
    const explicitStep = match[4] ? Number.parseInt(match[4], 10) : null
    const weekStep = explicitStep ?? (parity ? 2 : 1)

    if (startWeek < 1 || endWeek < startWeek || weekStep < 1) {
      throw createFormatError(`周次“${expression}”的范围或步长无效`)
    }

    if ((parity === 'ODD' || parity === '单') && startWeek % 2 !== 1) {
      throw createFormatError(`单周范围“${expression}”必须从单数周开始`)
    }

    if ((parity === 'EVEN' || parity === '双') && startWeek % 2 !== 0) {
      throw createFormatError(`双周范围“${expression}”必须从双数周开始`)
    }

    return {
      startWeek,
      endWeek,
      weekStep,
    }
  })

  if (ranges.length === 0) {
    throw createFormatError('课程缺少周次信息')
  }

  return ranges
}

function readField(line: string, labels: string[]) {
  for (const label of labels) {
    const value = line.match(new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, 'i'))?.[1]?.trim()
    if (value) {
      return value
    }
  }

  return ''
}

function parseDayLessons(page: ExtractedPdfPage, day: ScutPdfLessonContract['day']) {
  const { table } = SCUT_PDF_FIXED_LAYOUT
  const columnLeft = table.left + table.nodeColumnWidth + (day - 1) * table.dayColumnWidth
  const columnRight = columnLeft + table.dayColumnWidth
  const bodyTop = table.top + table.headerHeight
  const columnLines = groupPositionedLines(page.items.filter((item) => (
    item.x >= columnLeft
    && item.x < columnRight
    && item.top >= bodyTop
  )))
  const lessons: ScutPdfLessonContract[] = []

  for (let index = 0; index < columnLines.length; index += 1) {
    const courseName = readField(columnLines[index].text, ['课程', 'COURSE'])
    if (!courseName) {
      continue
    }

    const lessonLines = columnLines.slice(index, index + 6)
    const weekExpression = readField(lessonLines[1]?.text ?? '', ['周次', 'WEEKS'])
    const nodeExpression = readField(lessonLines[2]?.text ?? '', ['节次', 'NODES'])
    const teacher = readField(lessonLines[3]?.text ?? '', ['教师', 'TEACHER'])
    const room = readField(lessonLines[4]?.text ?? '', ['地点', '教室', 'ROOM'])
    const creditText = readField(lessonLines[5]?.text ?? '', ['学分', 'CREDIT'])

    if (!weekExpression || !nodeExpression || !teacher || !room || !creditText) {
      throw createFormatError(`${weekdayLabels[day - 1]}的课程“${courseName}”缺少周次、节次、教师、地点或学分`)
    }

    const nodeMatch = nodeExpression.match(/^(\d+)(?:-(\d+))?$/)
    if (!nodeMatch) {
      throw createFormatError(`课程“${courseName}”的节次“${nodeExpression}”无效`)
    }

    const startNode = Number.parseInt(nodeMatch[1], 10)
    const endNode = Number.parseInt(nodeMatch[2] ?? nodeMatch[1], 10)
    if (startNode < 1 || endNode < startNode || endNode > table.nodeCount) {
      throw createFormatError(`课程“${courseName}”的节次超出 1-${table.nodeCount} 节`)
    }

    const expectedCellTop = bodyTop + (startNode - 1) * table.nodeHeight
    if (columnLines[index].top < expectedCellTop || columnLines[index].top > expectedCellTop + table.nodeHeight) {
      throw createFormatError(`课程“${courseName}”的单元格位置与节次不一致`)
    }

    const credit = Number.parseFloat(creditText)
    if (!Number.isFinite(credit) || credit <= 0) {
      throw createFormatError(`课程“${courseName}”的学分无效`)
    }

    lessons.push({
      day,
      startNode,
      endNode,
      courseName,
      weekExpression,
      weekRanges: parseWeekRanges(weekExpression),
      teacher,
      room,
      credit,
    })
    index += 5
  }

  return lessons
}

export function parseScutSchedulePdfContract(extractedPdf: ExtractedSchedulePdf): ScutSchedulePdfContract {
  if (extractedPdf.pages.length !== 1 || extractedPdf.meta.pageCount !== 1) {
    throw createFormatError('当前仅支持单页华工学生个人课表')
  }

  const page = extractedPdf.pages[0]
  const { page: expectedPage, table } = SCUT_PDF_FIXED_LAYOUT
  if (
    page.rotation !== 0
    || Math.abs(page.width - expectedPage.width) > expectedPage.tolerance
    || Math.abs(page.height - expectedPage.height) > expectedPage.tolerance
  ) {
    throw createFormatError('页面尺寸、方向或旋转角度不符合固定横向 A4 布局')
  }

  const normalizedItems = page.items.map((item) => ({
    ...item,
    text: normalizeExtractedText(item.text),
  }))
  const title = normalizedItems
    .filter((item) => item.top < 80)
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const compactTitle = title.replace(/\s+/g, '')
  if (!compactTitle.includes('华南理工大学学生个人课表') && !title.includes('SCUT STUDENT TIMETABLE V1')) {
    throw createFormatError('未找到“华南理工大学学生个人课表”固定标题')
  }

  weekdayLabels.forEach((label, index) => {
    const expectedLeft = table.left + table.nodeColumnWidth + index * table.dayColumnWidth
    const found = normalizedItems.some((item) => (
      (item.text === label || item.text === weekdayAliases[index])
      && item.x >= expectedLeft
      && item.x < expectedLeft + table.dayColumnWidth
      && item.top >= table.top
      && item.top <= table.top + table.headerHeight + 15
    ))
    if (!found) {
      throw createFormatError(`缺少${label}列或列位置不符合固定布局`)
    }
  })

  for (let node = 1; node <= table.nodeCount; node += 1) {
    const expectedTop = table.top + table.headerHeight + (node - 1) * table.nodeHeight
    const found = normalizedItems.some((item) => (
      item.text === String(node)
      && item.x >= table.left
      && item.x < table.left + table.nodeColumnWidth
      && item.top >= expectedTop
      && item.top <= expectedTop + table.nodeHeight
    ))
    if (!found) {
      throw createFormatError(`缺少第 ${node} 节行标或行位置不符合固定布局`)
    }
  }

  const metadata = parseMetadataLine({ ...page, items: normalizedItems })
  const lessons = weekdayLabels.flatMap((_, index) => (
    parseDayLessons({ ...page, items: normalizedItems }, (index + 1) as ScutPdfLessonContract['day'])
  ))
  if (lessons.length === 0) {
    throw createFormatError('固定课表网格中没有可识别的课程')
  }

  return {
    version: 1,
    layout: SCUT_PDF_FIXED_LAYOUT.id,
    title: '华南理工大学学生个人课表',
    ...metadata,
    lessons,
  }
}

function isPdfJsTextItem(item: unknown): item is PdfJsTextItem {
  if (typeof item !== 'object' || item === null) {
    return false
  }

  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.str === 'string' &&
    typeof candidate.dir === 'string' &&
    Array.isArray(candidate.transform) &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.fontName === 'string'
  )
}

type ExtractScutSchedulePdfOptions = {
  parsedAt?: string
  runtime?: PdfjsRuntime
  pdfAssetBaseUrl?: string | null
}

export async function extractScutSchedulePdf(
  file: File,
  options: ExtractScutSchedulePdfOptions = {},
): Promise<ExtractedSchedulePdf> {
  assertScutPdfFileSize(file)
  const pdfjsRuntime = options.runtime ?? await getPdfjsRuntime()
  const pdfAssetBaseUrl = options.pdfAssetBaseUrl === undefined
    ? resolvePdfAssetBaseUrl(pdfjsRuntime.version)
    : options.pdfAssetBaseUrl
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sourceByteLength = bytes.byteLength
  const loadingTask = pdfjsRuntime.getDocument({
    data: bytes,
    ...(pdfAssetBaseUrl
      ? {
          cMapUrl: `${pdfAssetBaseUrl}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${pdfAssetBaseUrl}standard_fonts/`,
        }
      : {}),
  })

  try {
    const document = await loadingTask.promise
    assertScutPdfPageCount(document.numPages)
    const pages: ExtractedPdfPage[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const textContent = await page.getTextContent({
        includeMarkedContent: true,
        disableNormalization: false,
      })

      const items = textContent.items
        .flatMap((item, index) => {
          if (!isPdfJsTextItem(item)) {
            return []
          }

          const transform = item.transform.map((value) => Number(value))
          const x = transform[4] ?? 0
          const y = transform[5] ?? 0

          return [
            {
              index,
              text: item.str,
              dir: item.dir,
              fontName: item.fontName,
              transform,
              width: item.width,
              height: item.height,
              x,
              y,
              top: viewport.height - y,
              hasEOL: item.hasEOL ?? false,
            },
          ]
        })
        .sort((left, right) => {
          const topDiff = Math.abs(left.top - right.top)
          if (topDiff > 2) {
            return left.top - right.top
          }

          return left.x - right.x
        })

      pages.push({
        pageNumber,
        rotation: page.rotate,
        width: viewport.width,
        height: viewport.height,
        items,
      })
    }

    return {
      meta: {
        sourceFileName: file.name,
        byteLength: sourceByteLength,
        parsedAt: options.parsedAt ?? new Date().toISOString(),
        pageCount: document.numPages,
        pdfjsVersion: pdfjsRuntime.version,
      },
      pages,
    }
  } finally {
    await loadingTask.destroy()
  }
}
