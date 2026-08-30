// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractScutSchedulePdf,
  parseScutSchedulePdfContract,
  SCUT_PDF_FIXED_LAYOUT,
} from '../../../src/core/schedule/importScutPdf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, '..', '..', 'fixtures', 'public')

function loadPdfFixture(fileName: string) {
  const bytes = readFileSync(join(FIXTURE_DIR, fileName))
  return new File([bytes], fileName, { type: 'application/pdf' })
}

async function extractFixture(fileName: string) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  return extractScutSchedulePdf(loadPdfFixture(fileName), {
    parsedAt: '2026-08-30T00:00:00.000Z',
    runtime: {
      getDocument: pdfjs.getDocument,
      version: pdfjs.version,
    },
    pdfAssetBaseUrl: null,
  })
}

describe('SCUT fixed PDF extraction contract', () => {
  it('extracts the deterministic synthetic fixed-layout fixture', async () => {
    const file = loadPdfFixture('scutSchedule.synthetic.pdf')
    const extracted = await extractFixture('scutSchedule.synthetic.pdf')

    expect(extracted.meta).toMatchObject({
      sourceFileName: 'scutSchedule.synthetic.pdf',
      byteLength: file.size,
      parsedAt: '2026-08-30T00:00:00.000Z',
      pageCount: 1,
    })
    expect(extracted.pages).toHaveLength(1)
    expect(extracted.pages[0]).toMatchObject({
      pageNumber: 1,
      rotation: 0,
      width: SCUT_PDF_FIXED_LAYOUT.page.width,
      height: SCUT_PDF_FIXED_LAYOUT.page.height,
    })
    expect(extracted.pages[0].items.some((item) => item.text.includes('TEST-COURSE-ALPHA'))).toBe(true)
  })

  it('recognizes multiple courses, multi-node lessons, stepped weeks, metadata, teachers, rooms, and credits', async () => {
    const extracted = await extractFixture('scutSchedule.synthetic.pdf')
    const contract = parseScutSchedulePdfContract(extracted)

    expect(contract).toMatchObject({
      version: 1,
      layout: 'scut-student-timetable-v1',
      title: '华南理工大学学生个人课表',
      academicYear: '2026-2027',
      semester: 1,
      studentIdentifier: 'TEST-STUDENT-001',
      campus: 'TEST-CAMPUS',
      scheduleIdentifier: 'TEST-SCHEDULE-001',
    })
    expect(contract.lessons).toEqual([
      {
        day: 1,
        startNode: 1,
        endNode: 2,
        courseName: 'TEST-COURSE-ALPHA',
        weekExpression: '1-15(ODD)',
        weekRanges: [{ startWeek: 1, endWeek: 15, weekStep: 2 }],
        teacher: 'TEST-TEACHER-A,B',
        room: 'TEST-ROOM-A101',
        credit: 3.5,
      },
      {
        day: 2,
        startNode: 3,
        endNode: 5,
        courseName: 'TEST-COURSE-BETA',
        weekExpression: '2-16(EVEN)',
        weekRanges: [{ startWeek: 2, endWeek: 16, weekStep: 2 }],
        teacher: 'TEST-TEACHER-C',
        room: 'TEST-ROOM-B202',
        credit: 2,
      },
      {
        day: 3,
        startNode: 6,
        endNode: 7,
        courseName: 'TEST-COURSE-GAMMA',
        weekExpression: '1-4,9-12',
        weekRanges: [
          { startWeek: 1, endWeek: 4, weekStep: 1 },
          { startWeek: 9, endWeek: 12, weekStep: 1 },
        ],
        teacher: 'TEST-TEACHER-D',
        room: 'TEST-ROOM-C303',
        credit: 1.5,
      },
      {
        day: 5,
        startNode: 9,
        endNode: 10,
        courseName: 'TEST-COURSE-ALPHA',
        weekExpression: '2-14/2',
        weekRanges: [{ startWeek: 2, endWeek: 14, weekStep: 2 }],
        teacher: 'TEST-TEACHER-A',
        room: 'TEST-ROOM-D404',
        credit: 3.5,
      },
    ])
  })

  it('rejects a selectable-text PDF that does not match the supported SCUT layout', async () => {
    const extracted = await extractFixture('scutSchedule.unsupported.synthetic.pdf')

    expect(() => parseScutSchedulePdfContract(extracted)).toThrow(
      '不支持的华工课表 PDF 格式：未找到“华南理工大学学生个人课表”固定标题',
    )
  })
})
