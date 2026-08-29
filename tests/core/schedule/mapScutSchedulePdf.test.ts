// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildQmsExportText, buildWakeupExportText } from '../../../src/core/schedule/export'
import {
  extractScutSchedulePdf,
  parseScutSchedulePdfContract,
  type ScutSchedulePdfContract,
} from '../../../src/core/schedule/importScutPdf'
import { parseQmsScheduleText } from '../../../src/core/schedule/importQms'
import { parseWakeupScheduleText } from '../../../src/core/schedule/importWakeup'
import { mapScutSchedulePdf } from '../../../src/core/schedule/mapScutSchedulePdf'
import {
  SCHEDULE_LIBRARY_KEY,
  type ScheduleLibrary,
} from '../../../src/core/schedule/storage'
import type { SavedSchedule, ScheduleData } from '../../../src/core/schedule/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(__dirname, '..', '..', 'fixtures', 'public', 'scutSchedule.synthetic.pdf')

async function extractContract() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const bytes = readFileSync(FIXTURE_PATH)
  const file = new File([bytes], 'TEST-schedule.pdf', { type: 'application/pdf' })
  const extracted = await extractScutSchedulePdf(file, {
    parsedAt: '2026-08-30T00:00:00.000Z',
    runtime: {
      getDocument: pdfjs.getDocument,
      version: pdfjs.version,
    },
    pdfAssetBaseUrl: null,
  })

  return {
    contract: parseScutSchedulePdfContract(extracted),
    extractionMeta: extracted.meta,
  }
}

async function createMappedSchedule() {
  const { contract, extractionMeta } = await extractContract()
  return mapScutSchedulePdf(contract, extractionMeta, {
    semesterStartDate: '2026-08-31',
    importedAt: 1000,
  })
}

function createSavedSchedule(scheduleData: ScheduleData): SavedSchedule {
  return {
    id: 'TEST-SAVED-SCHEDULE',
    name: scheduleData.table.name,
    source: scheduleData.source,
    themeId: 'skyBlue',
    timeSlotPresetId: 'builtIn',
    semesterStartDate: scheduleData.table.startDate,
    createdAt: 2000,
    scheduleData,
  }
}

describe('mapScutSchedulePdf', () => {
  it('maps the approved fixed-layout contract into normalized scutPdf schedule data', async () => {
    const scheduleData = await createMappedSchedule()

    expect(scheduleData).toMatchObject({
      version: 1,
      source: 'scutPdf',
      importedAt: 1000,
      table: {
        name: 'TEST-STUDENT-001的课表（2026-2027学年第1学期）',
        campus: 'TEST-CAMPUS',
        school: '华南理工大学',
        maxWeek: 16,
        nodes: 12,
        startDate: '2026-08-31',
        showSat: false,
        showSun: false,
        timeTable: 2,
      },
    })
    expect(scheduleData.timeSlots).toHaveLength(11)
    expect(scheduleData.courses).toEqual([
      { id: 1, tableId: 1, name: 'TEST-COURSE-ALPHA', color: '', credit: 3.5, note: '' },
      { id: 2, tableId: 1, name: 'TEST-COURSE-BETA', color: '', credit: 2, note: '' },
      { id: 3, tableId: 1, name: 'TEST-COURSE-GAMMA', color: '', credit: 1.5, note: '' },
    ])
    expect(scheduleData.lessons).toHaveLength(5)
    expect(scheduleData.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        courseId: 1,
        day: 1,
        startNode: 1,
        endNode: 2,
        startWeek: 1,
        endWeek: 15,
        weekStep: 2,
        teacher: 'TEST-TEACHER-A,B',
        room: 'TEST-ROOM-A101',
      }),
      expect.objectContaining({
        courseId: 2,
        day: 2,
        startNode: 3,
        endNode: 5,
        startWeek: 2,
        endWeek: 16,
        weekStep: 2,
      }),
      expect.objectContaining({
        courseId: 3,
        startWeek: 1,
        endWeek: 4,
        weekStep: 1,
      }),
      expect.objectContaining({
        courseId: 3,
        startWeek: 9,
        endWeek: 12,
        weekStep: 1,
      }),
    ]))
  })

  it('stores diagnostic metadata only instead of PDF bytes or extracted page text', async () => {
    const scheduleData = await createMappedSchedule()

    expect(scheduleData.raw).toEqual({
      kind: 'scutPdf',
      sourceFileName: 'TEST-schedule.pdf',
      byteLength: expect.any(Number),
      pageCount: 1,
      pdfjsVersion: expect.any(String),
      extractedAt: '2026-08-30T00:00:00.000Z',
      layout: 'scut-student-timetable-v1',
      parserVersion: 1,
    })
    expect(JSON.stringify(scheduleData.raw)).not.toContain('TEST-COURSE-ALPHA')
    expect(scheduleData.raw).not.toHaveProperty('pages')
    expect(scheduleData.raw).not.toHaveProperty('bytes')
  })

  it('rejects missing time, week, and required fields plus conflicting course identity', async () => {
    const { contract, extractionMeta } = await extractContract()
    const missingWeeks = structuredClone(contract)
    missingWeeks.lessons[0].weekRanges = []

    expect(() => mapScutSchedulePdf(missingWeeks, extractionMeta, {
      semesterStartDate: '2026-08-31',
    })).toThrow('华工课表 PDF 映射失败：课程“TEST-COURSE-ALPHA”缺少周次范围')

    const missingTime = structuredClone(contract)
    missingTime.lessons[0].startNode = 0
    expect(() => mapScutSchedulePdf(missingTime, extractionMeta, {
      semesterStartDate: '2026-08-31',
    })).toThrow('华工课表 PDF 映射失败：课程节次字段无效')

    const missingRoom = structuredClone(contract)
    missingRoom.lessons[0].room = ' '
    expect(() => mapScutSchedulePdf(missingRoom, extractionMeta, {
      semesterStartDate: '2026-08-31',
    })).toThrow('华工课表 PDF 映射失败：缺少课程“TEST-COURSE-ALPHA”的教室')

    const conflictingCredit = structuredClone(contract)
    conflictingCredit.lessons[3].credit = 4
    expect(() => mapScutSchedulePdf(conflictingCredit, extractionMeta, {
      semesterStartDate: '2026-08-31',
    })).toThrow('华工课表 PDF 映射失败：课程“TEST-COURSE-ALPHA”存在冲突的学分信息')
  })

  it('remains compatible with QMS v2 and the normalized WakeUp export fallback', async () => {
    const scheduleData = await createMappedSchedule()
    const savedSchedule = createSavedSchedule(scheduleData)

    const qmsPayload = JSON.parse(buildQmsExportText(savedSchedule)) as Record<string, unknown>
    expect(JSON.stringify(qmsPayload)).not.toContain('sourceFileName')
    const qmsImported = parseQmsScheduleText(JSON.stringify(qmsPayload))
    expect(qmsImported.scheduleData.source).toBe('scutPdf')
    expect(qmsImported.scheduleData.raw).toEqual({
      kind: 'scutPdf',
      sourceFileName: null,
      byteLength: null,
      pageCount: null,
      pdfjsVersion: null,
      extractedAt: null,
      layout: 'scut-student-timetable-v1',
      parserVersion: 1,
    })
    expect(qmsImported.scheduleData.courses).toEqual(scheduleData.courses)
    expect(qmsImported.scheduleData.lessons).toEqual(scheduleData.lessons)

    const qmsV1Imported = parseQmsScheduleText(JSON.stringify({
      schema: 'qms',
      version: 1,
      exportedAt: 3000,
      schedule: savedSchedule,
    }))
    expect(qmsV1Imported.scheduleData).toEqual(scheduleData)

    const wakeupImported = parseWakeupScheduleText(buildWakeupExportText(savedSchedule))
    expect(wakeupImported.courses.map((course) => course.name)).toEqual(
      scheduleData.courses.map((course) => course.name),
    )
    expect(wakeupImported.lessons).toHaveLength(scheduleData.lessons.length)
  })

  it('accepts a valid scutPdf schedule in storage and rejects a mismatched raw source', async () => {
    const scheduleData = await createMappedSchedule()
    const library: ScheduleLibrary = {
      version: 1,
      activeScheduleId: 'TEST-SAVED-SCHEDULE',
      schedules: [createSavedSchedule(scheduleData)],
    }
    const encoded = SCHEDULE_LIBRARY_KEY.codec.encode(library)
    expect(SCHEDULE_LIBRARY_KEY.codec.decode(encoded)).toEqual(library)

    const invalidLibrary = structuredClone(library) as unknown as {
      schedules: Array<{ scheduleData: ScheduleData }>
    }
    invalidLibrary.schedules[0].scheduleData.raw = {
      kind: 'scutHtml',
      html: '',
    }
    expect(() => SCHEDULE_LIBRARY_KEY.codec.decode(JSON.stringify(invalidLibrary))).toThrow('课表库数据格式无效')
  })
})
