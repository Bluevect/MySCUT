import { getScheduleWeekStorage } from './scheduleWeekStorage'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const SCHEDULE_WEEK_VIEW_STORAGE_PREFIX = 'scheduleWeekView:'

type StoredScheduleWeekView = {
  semesterStartDate: string
  week: number
}

export type ScheduleWeekView = {
  week: number
  hasManualOverride: boolean
}

function parseDateParts(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function getStorageKey(scheduleId: string) {
  return `${SCHEDULE_WEEK_VIEW_STORAGE_PREFIX}${encodeURIComponent(scheduleId)}`
}

function isStoredScheduleWeekView(value: unknown): value is StoredScheduleWeekView {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.semesterStartDate === 'string' &&
    typeof candidate.week === 'number' &&
    Number.isInteger(candidate.week) &&
    candidate.week >= 1
  )
}

function readRememberedScheduleWeek(scheduleId: string, semesterStartDate: string) {
  try {
    const raw = localStorage.getItem(getStorageKey(scheduleId))
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isStoredScheduleWeekView(parsed) || parsed.semesterStartDate !== semesterStartDate) {
      localStorage.removeItem(getStorageKey(scheduleId))
      return null
    }

    return parsed.week
  } catch {
    return null
  }
}

function getScheduleDayDifference(date: Date, semesterStartDateText: string) {
  const semesterStart = parseDateParts(semesterStartDateText)
  if (!semesterStart || Number.isNaN(date.getTime())) {
    return null
  }

  const semesterStartDay = Date.UTC(semesterStart.year, semesterStart.month - 1, semesterStart.day)
  const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((currentDay - semesterStartDay) / DAY_IN_MS)
}

export function getScheduleWeekNumber(date: Date, semesterStartDateText: string) {
  const differenceDays = getScheduleDayDifference(date, semesterStartDateText)
  if (differenceDays === null) {
    return 1
  }

  const week = Math.floor(differenceDays / 7) + 1

  return Math.max(1, week)
}

export function hasScheduleStarted(date: Date, semesterStartDateText: string) {
  const differenceDays = getScheduleDayDifference(date, semesterStartDateText)
  return differenceDays !== null && differenceDays >= 0
}

export function clampScheduleWeek(week: number, maxWeek: number) {
  const safeMaxWeek = Number.isFinite(maxWeek) ? Math.max(1, Math.floor(maxWeek)) : 1
  const safeWeek = Number.isFinite(week) ? Math.max(1, Math.floor(week)) : 1

  return Math.min(safeWeek, safeMaxWeek)
}

export function getScheduleWeekStartDate(semesterStartDateText: string, weekNumber: number) {
  const semesterStart = parseDateParts(semesterStartDateText)
  if (!semesterStart) {
    return null
  }

  const normalizedWeek = Number.isInteger(weekNumber) && weekNumber >= 1 ? weekNumber : 1
  return new Date(
    semesterStart.year,
    semesterStart.month - 1,
    semesterStart.day + (normalizedWeek - 1) * 7,
  )
}

export function getScheduleWeekdayOffset(semesterStartDateText: string) {
  const semesterStart = parseDateParts(semesterStartDateText)
  if (!semesterStart) {
    return 0
  }

  const weekday = new Date(semesterStart.year, semesterStart.month - 1, semesterStart.day).getDay()
  return (weekday + 6) % 7
}

export function getScheduleLessonDayForColumn(weekdayOffset: number, columnIndex: number) {
  return ((weekdayOffset + columnIndex) % 7) + 1
}

export function resolveInitialScheduleWeekView(
  scheduleId: string,
  semesterStartDate: string,
  inferredCurrentWeek: number,
  maxWeek = Number.MAX_SAFE_INTEGER,
): ScheduleWeekView {
  const rememberedWeek = readRememberedScheduleWeek(scheduleId, semesterStartDate)
  const normalizedInferredWeek = clampScheduleWeek(inferredCurrentWeek, maxWeek)
  const normalizedRememberedWeek =
    rememberedWeek === null ? null : clampScheduleWeek(rememberedWeek, maxWeek)

  if (
    normalizedRememberedWeek === null ||
    normalizedRememberedWeek === normalizedInferredWeek ||
    !getScheduleWeekStorage()
  ) {
    clearRememberedScheduleWeek(scheduleId)
    return {
      week: normalizedInferredWeek,
      hasManualOverride: false,
    }
  }

  return {
    week: normalizedRememberedWeek,
    hasManualOverride: true,
  }
}

export function rememberScheduleWeek(scheduleId: string, semesterStartDate: string, week: number) {
  if (!Number.isInteger(week) || week < 1) {
    return false
  }

  try {
    const value: StoredScheduleWeekView = {
      semesterStartDate,
      week,
    }
    localStorage.setItem(getStorageKey(scheduleId), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function clearRememberedScheduleWeek(scheduleId: string) {
  try {
    localStorage.removeItem(getStorageKey(scheduleId))
    return true
  } catch {
    return false
  }
}
