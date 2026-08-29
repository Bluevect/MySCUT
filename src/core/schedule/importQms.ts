import type { SavedSchedule, ScheduleData, TimeSlotPresetId, WakeupTimeSlot } from './types'
import { assertScheduleTextByteLength } from './importLimits'
import { trimRedundantTimeSlots } from './timeSlotTrim'

type QmsPayloadV1 = {
  schema: 'qms'
  version: 1
  exportedAt: number
  schedule: SavedSchedule
}

type QmsPayloadV2 = {
  schema: 'qms'
  version: 2
  exportedAt: number
  schedule: {
    name: string
    source: ScheduleData['source']
    themeId: string
    semesterStartDate: string
    createdAt: number
    timeSlotPresetId: TimeSlotPresetId
    scheduleData: {
      version: 1
      source: ScheduleData['source']
      importedAt: number
      table: ScheduleData['table']
      timeSlots?: WakeupTimeSlot[]
      courses: ScheduleData['courses']
      lessons: ScheduleData['lessons']
    }
  }
}

type ParsedQmsResult = {
  scheduleData: ScheduleData
  themeId: string
  semesterStartDate: string
  preferredName: string
  timeSlotPresetId: TimeSlotPresetId
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScheduleSource(value: unknown): value is ScheduleData['source'] {
  return value === 'wakeup' || value === 'scutHtml' || value === 'scutPdf' || value === 'intersection'
}

function isScutPdfRaw(value: unknown) {
  if (!isObject(value) || value.kind !== 'scutPdf') {
    return false
  }

  return (
    (typeof value.sourceFileName === 'string' || value.sourceFileName === null) &&
    (typeof value.byteLength === 'number' || value.byteLength === null) &&
    (typeof value.pageCount === 'number' || value.pageCount === null) &&
    (typeof value.pdfjsVersion === 'string' || value.pdfjsVersion === null) &&
    (typeof value.extractedAt === 'string' || value.extractedAt === null) &&
    value.layout === 'scut-student-timetable-v1' &&
    value.parserVersion === 1
  )
}

function normalizeTimeSlotPresetId(value: unknown): TimeSlotPresetId {
  if (value === 'universityTown' || value === 'wushan' || value === 'international' || value === 'builtIn' || value === 'union') {
    return value
  }

  return 'builtIn'
}

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isObject(value)) {
    return false
  }

  if (value.version !== 1) {
    return false
  }

  if (!isScheduleSource(value.source)) {
    return false
  }

  if (!isObject(value.table) || !Array.isArray(value.courses) || !Array.isArray(value.lessons)) {
    return false
  }

  return value.source !== 'scutPdf' || isScutPdfRaw(value.raw)
}

function isSavedSchedule(value: unknown): value is SavedSchedule {
  if (!isObject(value)) {
    return false
  }

  if (typeof value.id !== 'string' || typeof value.name !== 'string' || !isScheduleSource(value.source)) {
    return false
  }

  if (typeof value.themeId !== 'string' || typeof value.semesterStartDate !== 'string') {
    return false
  }

  if (!isScheduleData(value.scheduleData)) {
    return false
  }

  return value.source === value.scheduleData.source
}

function isQmsPayloadV1(value: unknown): value is QmsPayloadV1 {
  if (!isObject(value)) {
    return false
  }

  if (value.schema !== 'qms' || value.version !== 1 || typeof value.exportedAt !== 'number') {
    return false
  }

  return isSavedSchedule(value.schedule)
}

function isQmsPayloadV2(value: unknown): value is QmsPayloadV2 {
  if (!isObject(value)) {
    return false
  }

  if (value.schema !== 'qms' || value.version !== 2 || typeof value.exportedAt !== 'number') {
    return false
  }

  if (!isObject(value.schedule)) {
    return false
  }

  const schedule = value.schedule
  if (
    typeof schedule.name !== 'string' ||
    typeof schedule.themeId !== 'string' ||
    typeof schedule.semesterStartDate !== 'string' ||
    typeof schedule.createdAt !== 'number' ||
    !isObject(schedule.scheduleData)
  ) {
    return false
  }

  if (!isScheduleSource(schedule.source)) {
    return false
  }

  const scheduleData = schedule.scheduleData
  if (
    scheduleData.version !== 1 ||
    !isScheduleSource(scheduleData.source) ||
    schedule.source !== scheduleData.source ||
    typeof scheduleData.importedAt !== 'number' ||
    !isObject(scheduleData.table) ||
    !Array.isArray(scheduleData.courses) ||
    !Array.isArray(scheduleData.lessons)
  ) {
    return false
  }

  if (typeof scheduleData.timeSlots !== 'undefined' && !Array.isArray(scheduleData.timeSlots)) {
    return false
  }

  return true
}

function createQmsImportedRaw(source: ScheduleData['source']): ScheduleData['raw'] {
  if (source === 'scutPdf') {
    return {
      kind: 'scutPdf',
      sourceFileName: null,
      byteLength: null,
      pageCount: null,
      pdfjsVersion: null,
      extractedAt: null,
      layout: 'scut-student-timetable-v1',
      parserVersion: 1,
    }
  }

  return {
    kind: 'scutHtml',
    html: '',
  }
}

function sanitizeScheduleDataTimeSlots(scheduleData: ScheduleData) {
  const trimmedTimeSlots = trimRedundantTimeSlots(scheduleData.timeSlots)
  const nextScheduleData: ScheduleData = {
    ...scheduleData,
    timeSlots: trimmedTimeSlots,
    raw: scheduleData.raw,
  }

  if (scheduleData.raw.kind === 'wakeup') {
    nextScheduleData.raw = {
      ...scheduleData.raw,
      timeSlots: trimRedundantTimeSlots(scheduleData.raw.timeSlots),
    }
  }

  return nextScheduleData
}

function parseFromV1(payload: QmsPayloadV1): ParsedQmsResult {
  const schedule = payload.schedule
  const timeSlotPresetId = normalizeTimeSlotPresetId(schedule.timeSlotPresetId)

  return {
    scheduleData: sanitizeScheduleDataTimeSlots(schedule.scheduleData),
    themeId: schedule.themeId,
    semesterStartDate: schedule.semesterStartDate,
    preferredName: schedule.name,
    timeSlotPresetId,
  }
}

function parseFromV2(payload: QmsPayloadV2): ParsedQmsResult {
  const schedule = payload.schedule
  const timeSlotPresetId = normalizeTimeSlotPresetId(schedule.timeSlotPresetId)
  const trimmedTimeSlots = trimRedundantTimeSlots(schedule.scheduleData.timeSlots ?? [])

  const scheduleData: ScheduleData = {
    version: 1,
    source: schedule.scheduleData.source,
    importedAt: schedule.scheduleData.importedAt,
    table: {
      ...schedule.scheduleData.table,
    },
    timeSlots: timeSlotPresetId === 'builtIn' ? trimmedTimeSlots : [],
    courses: schedule.scheduleData.courses,
    lessons: schedule.scheduleData.lessons,
    raw: createQmsImportedRaw(schedule.scheduleData.source),
  }

  return {
    scheduleData,
    themeId: schedule.themeId,
    semesterStartDate: schedule.semesterStartDate,
    preferredName: schedule.name,
    timeSlotPresetId,
  }
}

export function parseQmsScheduleText(text: string): ParsedQmsResult {
  assertScheduleTextByteLength(text, 'QMS')
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('QMS 文件解析失败：JSON 格式无效')
  }

  if (isQmsPayloadV1(parsed)) {
    return parseFromV1(parsed)
  }

  if (isQmsPayloadV2(parsed)) {
    return parseFromV2(parsed)
  }

  throw new Error('QMS 文件结构无效或版本不受支持')
}
