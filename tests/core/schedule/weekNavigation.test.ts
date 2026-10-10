// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampScheduleWeek,
  getScheduleLessonDayForColumn,
  getScheduleWeekNumber,
  getScheduleWeekStartDate,
  getScheduleWeekdayOffset,
  hasScheduleStarted,
  rememberScheduleWeek,
  resolveInitialScheduleWeekView,
} from '../../../src/core/schedule/weekNavigation'

describe('getScheduleWeekNumber', () => {
  it('infers weeks from seven-day blocks starting at the semester date', () => {
    expect(getScheduleWeekNumber(new Date(2026, 1, 23), '2026-02-23')).toBe(1)
    expect(getScheduleWeekNumber(new Date(2026, 2, 1), '2026-02-23')).toBe(1)
    expect(getScheduleWeekNumber(new Date(2026, 2, 2), '2026-02-23')).toBe(2)
    expect(getScheduleWeekNumber(new Date(2026, 6, 16), '2026-02-23')).toBe(21)
  })

  it('clamps dates before semester start and rejects invalid dates', () => {
    expect(getScheduleWeekNumber(new Date(2026, 1, 1), '2026-02-23')).toBe(1)
    expect(getScheduleWeekNumber(new Date(2026, 1, 23), '2026-02-31')).toBe(1)
    expect(getScheduleWeekNumber(new Date(Number.NaN), '2026-02-23')).toBe(1)
  })
})

describe('hasScheduleStarted', () => {
  it('distinguishes dates before, on, and after the semester start', () => {
    expect(hasScheduleStarted(new Date(2026, 1, 22), '2026-02-23')).toBe(false)
    expect(hasScheduleStarted(new Date(2026, 1, 23), '2026-02-23')).toBe(true)
    expect(hasScheduleStarted(new Date(2026, 1, 24), '2026-02-23')).toBe(true)
  })

  it('returns false when either date is invalid', () => {
    expect(hasScheduleStarted(new Date(Number.NaN), '2026-02-23')).toBe(false)
    expect(hasScheduleStarted(new Date(2026, 1, 23), '2026-02-31')).toBe(false)
  })
})

describe('clampScheduleWeek', () => {
  it('keeps weeks inside the available semester range', () => {
    expect(clampScheduleWeek(0, 16)).toBe(1)
    expect(clampScheduleWeek(1, 16)).toBe(1)
    expect(clampScheduleWeek(8, 16)).toBe(8)
    expect(clampScheduleWeek(16, 16)).toBe(16)
    expect(clampScheduleWeek(17, 16)).toBe(16)
  })

  it('falls back to a valid week when values are not finite', () => {
    expect(clampScheduleWeek(Number.NaN, 16)).toBe(1)
    expect(clampScheduleWeek(8, Number.NaN)).toBe(1)
  })
})

describe('schedule week start and columns', () => {
  it('starts each displayed week on the configured initial date', () => {
    expect(getScheduleWeekStartDate('2026-09-01', 1)).toEqual(new Date(2026, 8, 1))
    expect(getScheduleWeekStartDate('2026-09-01', 2)).toEqual(new Date(2026, 8, 8))
    expect(getScheduleWeekStartDate('2026-02-23', 1)).toEqual(new Date(2026, 1, 23))
    expect(getScheduleWeekStartDate('2026-02-25', 1)).toEqual(new Date(2026, 1, 25))
    expect(getScheduleWeekStartDate('2026-03-01', 1)).toEqual(new Date(2026, 2, 1))
    expect(getScheduleWeekStartDate('2026-02-25', 2)).toEqual(new Date(2026, 2, 4))
  })

  it('returns null for an invalid configured date', () => {
    expect(getScheduleWeekStartDate('2026-02-31', 1)).toBeNull()
  })

  it('rotates weekday columns while keeping lesson days Monday-based', () => {
    expect(getScheduleWeekdayOffset('2026-02-23')).toBe(0)
    expect(getScheduleWeekdayOffset('2026-02-25')).toBe(2)
    expect(getScheduleWeekdayOffset('2026-03-01')).toBe(6)

    const offset = getScheduleWeekdayOffset('2026-09-01')

    expect(offset).toBe(1)
    expect(
      Array.from({ length: 7 }, (_, columnIndex) =>
        getScheduleLessonDayForColumn(offset, columnIndex),
      ),
    ).toEqual([2, 3, 4, 5, 6, 7, 1])
  })

  it('defaults to Monday-first columns and placeholders for an invalid date', () => {
    expect(getScheduleWeekStartDate('2026-02-31', 1)).toBeNull()
    expect(getScheduleWeekdayOffset('2026-02-31')).toBe(0)
    expect(getScheduleLessonDayForColumn(0, 0)).toBe(1)
  })
})

describe('schedule week view memory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses the inferred week when there is no manual override', () => {
    expect(resolveInitialScheduleWeekView('schedule-a', '2026-02-23', 4)).toEqual({
      week: 4,
      hasManualOverride: false,
    })
  })

  it('restores a manually selected week for the same schedule and semester date', () => {
    expect(rememberScheduleWeek('schedule-a', '2026-02-23', 9)).toBe(true)
    expect(resolveInitialScheduleWeekView('schedule-a', '2026-02-23', 4)).toEqual({
      week: 9,
      hasManualOverride: true,
    })
  })

  it('drops the override after returning to the inferred current week', () => {
    rememberScheduleWeek('schedule-a', '2026-02-23', 4)

    expect(resolveInitialScheduleWeekView('schedule-a', '2026-02-23', 4)).toEqual({
      week: 4,
      hasManualOverride: false,
    })
    expect(resolveInitialScheduleWeekView('schedule-a', '2026-02-23', 5)).toEqual({
      week: 5,
      hasManualOverride: false,
    })
  })

  it('isolates memory by schedule and invalidates it when the semester date changes', () => {
    rememberScheduleWeek('schedule-a', '2026-02-23', 7)

    expect(resolveInitialScheduleWeekView('schedule-b', '2026-02-23', 3)).toEqual({
      week: 3,
      hasManualOverride: false,
    })
    expect(resolveInitialScheduleWeekView('schedule-a', '2026-03-02', 2)).toEqual({
      week: 2,
      hasManualOverride: false,
    })
  })

  it('clamps remembered weeks to the available semester range', () => {
    rememberScheduleWeek('schedule-a', '2026-02-23', 20)

    expect(resolveInitialScheduleWeekView('schedule-a', '2026-02-23', 17, 16)).toEqual({
      week: 16,
      hasManualOverride: false,
    })
  })
})
