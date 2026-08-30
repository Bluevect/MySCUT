import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  decodeCompressedQmsText,
  encodeCompressedQmsText,
} from '../../../src/core/schedule/compressedQms'
import {
  buildQmsExportText,
  buildWakeupExportText,
} from '../../../src/core/schedule/export'
import { ScheduleImportError } from '../../../src/core/schedule/importErrors'
import { parseQmsScheduleText } from '../../../src/core/schedule/importQms'
import { parseWakeupScheduleText } from '../../../src/core/schedule/importWakeup'
import { ScheduleRepository } from '../../../src/core/schedule/storage'
import {
  InMemoryMigrationJournal,
  InMemoryPersistentStore,
  type StorageLike,
} from '../../../src/core/storage'
import type { SavedSchedule, ScheduleData } from '../../../src/core/schedule/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WAKEUP_FIXTURE_PATH = join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'public',
  'wakeupSchedule.synthetic.txt',
)

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function createNormalizedSchedule(): ScheduleData {
  return {
    version: 1,
    source: 'scutHtml',
    importedAt: 100,
    table: {
      id: 1,
      name: 'TEST-NORMALIZED-SCHEDULE',
      campus: 'TEST-CAMPUS',
      school: 'TEST-UNIVERSITY',
      maxWeek: 16,
      nodes: 2,
      startDate: '2026-08-31',
      showSat: false,
      showSun: false,
      timeTable: 2,
    },
    timeSlots: [
      { node: 1, startTime: '08:00', endTime: '08:45', timeTable: 2 },
      { node: 2, startTime: '08:55', endTime: '09:40', timeTable: 2 },
    ],
    courses: [{
      id: 1,
      tableId: 1,
      name: 'TEST-COURSE-ALPHA',
      color: '#123456',
      credit: 3,
      note: 'TEST-COURSE-NOTE',
    }],
    lessons: [{
      instanceId: 'TEST-LESSON-ALPHA',
      courseId: 1,
      tableId: 1,
      day: 1,
      startNode: 1,
      endNode: 2,
      startWeek: 1,
      endWeek: 15,
      weekStep: 2,
      ownTime: false,
      startTime: '',
      endTime: '',
      room: 'TEST-ROOM-A101',
      teacher: 'TEST-TEACHER-A',
      detailText: 'TEST-DETAIL',
      type: 0,
      level: 0,
    }],
    raw: {
      kind: 'scutHtml',
      html: '<html>TEST-RAW-MUST-NOT-BE-REQUIRED</html>',
    },
  }
}

function createSavedSchedule(scheduleData = createNormalizedSchedule()): SavedSchedule {
  return {
    id: 'TEST-SAVED-SCHEDULE',
    name: 'TEST-SAVED-NAME',
    source: scheduleData.source,
    themeId: 'palacePlum',
    timeSlotPresetId: 'builtIn',
    semesterStartDate: '2026-08-31',
    createdAt: 200,
    scheduleData,
  }
}

function normalizedBusinessFields(scheduleData: ScheduleData) {
  return {
    version: scheduleData.version,
    source: scheduleData.source,
    table: scheduleData.table,
    timeSlots: scheduleData.timeSlots,
    courses: scheduleData.courses,
    lessons: scheduleData.lessons,
  }
}

function addWakeupExtraMetadata(text: string) {
  const lines = text.trim().split(/\r?\n/)
  const meta = JSON.parse(lines[0]) as Record<string, unknown>
  const timeSlots = JSON.parse(lines[1]) as Array<Record<string, unknown>>
  const tableConfig = JSON.parse(lines[2]) as Record<string, unknown>
  const courses = JSON.parse(lines[3]) as Array<Record<string, unknown>>
  const lessons = JSON.parse(lines[4]) as Array<Record<string, unknown>>

  meta.testExtraMeta = 'TEST-EXTRA-META'
  timeSlots[0].testExtraSlot = 'TEST-EXTRA-SLOT'
  tableConfig.testExtraTable = 'TEST-EXTRA-TABLE'
  courses[0].testExtraCourse = 'TEST-EXTRA-COURSE'
  lessons[0].testExtraLesson = 'TEST-EXTRA-LESSON'

  return [meta, timeSlots, tableConfig, courses, lessons]
    .map((value) => JSON.stringify(value))
    .join('\n')
}

async function saveAndReload(scheduleData: ScheduleData) {
  const repository = new ScheduleRepository()
  await repository.initialize({
    store: new InMemoryPersistentStore(),
    migrationJournal: new InMemoryMigrationJournal(),
  }, new MemoryStorage())

  await repository.saveScheduleDataWithOptions(scheduleData, {
    themeId: 'palacePlum',
    timeSlotPresetId: 'builtIn',
    semesterStartDate: scheduleData.table.startDate,
    preferredName: scheduleData.table.name,
    setActive: true,
  })

  const loaded = repository.loadActiveScheduleEntry()
  if (!loaded) {
    throw new Error('saved TEST schedule missing')
  }

  return loaded
}

describe('QMS format round trips', () => {
  it('restores QMS v2 normalized business fields without exporting or depending on raw', () => {
    const original = createSavedSchedule()
    const qmsText = buildQmsExportText(original)
    const payload = JSON.parse(qmsText) as {
      schedule: { scheduleData: Record<string, unknown> }
    }

    expect(payload.schedule.scheduleData).not.toHaveProperty('raw')
    expect(qmsText).not.toContain('TEST-RAW-MUST-NOT-BE-REQUIRED')

    const imported = parseQmsScheduleText(qmsText)
    expect(imported).toMatchObject({
      themeId: 'palacePlum',
      semesterStartDate: '2026-08-31',
      preferredName: 'TEST-SAVED-NAME',
      timeSlotPresetId: 'builtIn',
    })
    expect(normalizedBusinessFields(imported.scheduleData)).toEqual(
      normalizedBusinessFields(original.scheduleData),
    )
    expect(imported.scheduleData.raw).toEqual({
      kind: 'scutHtml',
      html: '',
    })
  })

  it('encodes, decodes, and parses compressed QMS without raw restoration', async () => {
    const original = createSavedSchedule()
    const qmsText = buildQmsExportText(original)
    const compressed = await encodeCompressedQmsText(qmsText)
    const decoded = await decodeCompressedQmsText(compressed)
    const imported = parseQmsScheduleText(decoded)

    expect(decoded).toBe(qmsText)
    expect(normalizedBusinessFields(imported.scheduleData)).toEqual(
      normalizedBusinessFields(original.scheduleData),
    )
    expect(imported.scheduleData.raw).toEqual({ kind: 'scutHtml', html: '' })
  })

  it('returns actionable typed errors for malformed QMS and compressed QMS input', async () => {
    expect(() => parseQmsScheduleText('{TEST-BROKEN-JSON')).toThrowError(ScheduleImportError)

    try {
      parseQmsScheduleText('{TEST-BROKEN-JSON')
      throw new Error('expected malformed QMS JSON to fail')
    } catch (error) {
      expect(error).toMatchObject({
        name: 'ScheduleImportError',
        code: 'qms-invalid-json',
        message: 'QMS 文件解析失败：JSON 格式无效',
      })
    }

    try {
      parseQmsScheduleText(JSON.stringify({ schema: 'qms', version: 999 }))
      throw new Error('expected unsupported QMS structure to fail')
    } catch (error) {
      expect(error).toMatchObject({
        name: 'ScheduleImportError',
        code: 'qms-invalid-structure',
        message: 'QMS 文件结构无效或版本不受支持',
      })
    }

    await expect(decodeCompressedQmsText('%%%TEST-INVALID-BASE64%%%')).rejects.toMatchObject({
      name: 'ScheduleImportError',
      code: 'compressed-qms-invalid-base64',
      message: '压缩QMS解析失败：Base64 编码无效',
    })
    await expect(decodeCompressedQmsText(btoa('TEST-NOT-ZSTD'))).rejects.toMatchObject({
      name: 'ScheduleImportError',
      code: 'compressed-qms-invalid-zstd',
      message: '压缩QMS解析失败：Zstd 解压失败',
    })
  })
})

describe('WakeUp format round trips', () => {
  it('preserves high-fidelity WakeUp raw metadata through import, save/load, export, and import', async () => {
    const fixture = readFileSync(WAKEUP_FIXTURE_PATH, 'utf8')
    const imported = parseWakeupScheduleText(addWakeupExtraMetadata(fixture))
    const loaded = await saveAndReload(imported)
    const exportedText = buildWakeupExportText(loaded)
    const exportedLines = exportedText.split(/\r?\n/).map((line) => JSON.parse(line) as unknown)

    expect(exportedLines[0]).toMatchObject({ testExtraMeta: 'TEST-EXTRA-META' })
    expect(exportedLines[1]).toEqual(expect.arrayContaining([
      expect.objectContaining({ testExtraSlot: 'TEST-EXTRA-SLOT' }),
    ]))
    expect(exportedLines[2]).toMatchObject({ testExtraTable: 'TEST-EXTRA-TABLE' })
    expect(exportedLines[3]).toEqual(expect.arrayContaining([
      expect.objectContaining({ testExtraCourse: 'TEST-EXTRA-COURSE' }),
    ]))
    expect(exportedLines[4]).toEqual(expect.arrayContaining([
      expect.objectContaining({ testExtraLesson: 'TEST-EXTRA-LESSON' }),
    ]))

    const reimported = parseWakeupScheduleText(exportedText)
    expect(normalizedBusinessFields(reimported)).toEqual(normalizedBusinessFields(imported))
  })

  it('creates a semantic WakeUp fallback for non-WakeUp schedules without copying raw data', () => {
    const original = createSavedSchedule()
    const exportedText = buildWakeupExportText(original)
    const exportedLines = exportedText.split(/\r?\n/)
    const exportedMeta = JSON.parse(exportedLines[0]) as Record<string, unknown>
    const exportedTable = JSON.parse(exportedLines[2]) as Record<string, unknown>

    expect(exportedMeta).not.toHaveProperty('testExtraMeta')
    expect(exportedTable).toMatchObject({
      tableName: 'TEST-NORMALIZED-SCHEDULE',
      tid: 'qimeng-export',
    })
    expect(exportedText).not.toContain('TEST-RAW-MUST-NOT-BE-REQUIRED')

    const imported = parseWakeupScheduleText(exportedText)
    expect(imported.source).toBe('wakeup')
    expect(imported.courses).toEqual(original.scheduleData.courses)
    expect(imported.lessons).toEqual([
      expect.objectContaining({
        courseId: 1,
        day: 1,
        startNode: 1,
        endNode: 2,
        startWeek: 1,
        endWeek: 15,
        startTime: '08:00',
        endTime: '09:40',
        room: 'TEST-ROOM-A101',
        teacher: 'TEST-TEACHER-A',
      }),
    ])
    expect(imported.table).toMatchObject({
      name: 'TEST-NORMALIZED-SCHEDULE',
      campus: 'TEST-CAMPUS',
      startDate: '2026-08-31',
    })
  })
})
