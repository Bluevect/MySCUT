import { describe, it, expect } from 'vitest'
import { getDefaultSemesterStartDate } from '../../../src/core/schedule/semesterStartDateUtils'

// month is 1-12 here; converts to Date's 0-11 internally
const date = (year: number, month: number, day: number) => new Date(year, month - 1, day)

describe('getDefaultSemesterStartDate', () => {
  describe('semester month detection', () => {
    it('January uses previous year September as base', () => {
      // 2026-01-15 -> base 2025-09-01 (Mon) -> 2025-09-01
      expect(getDefaultSemesterStartDate(date(2026, 1, 15))).toBe('2025-09-01')
    })

    it('January 1st uses previous year September as base', () => {
      expect(getDefaultSemesterStartDate(date(2026, 1, 1))).toBe('2025-09-01')
    })

    it('February to June uses current year March as base', () => {
      // 2026-04-10 -> base 2026-03-01 (Sun) -> nearest Monday 2026-03-02
      expect(getDefaultSemesterStartDate(date(2026, 4, 10))).toBe('2026-03-02')
    })

    it('last day of June still uses current year March', () => {
      expect(getDefaultSemesterStartDate(date(2026, 6, 30))).toBe('2026-03-02')
    })

    it('July uses current year September as base', () => {
      // 2026-07-01 -> base 2026-09-01 (Tue) -> nearest Monday 2026-08-31
      expect(getDefaultSemesterStartDate(date(2026, 7, 1))).toBe('2026-08-31')
    })

    it('October uses current year September as base', () => {
      expect(getDefaultSemesterStartDate(date(2026, 10, 7))).toBe('2026-08-31')
    })

    it('December still uses current year September as base', () => {
      expect(getDefaultSemesterStartDate(date(2026, 12, 31))).toBe('2026-08-31')
    })
  })

  describe('nearest Monday resolution', () => {
    it('base is Monday -> returns same day', () => {
      // 2025-09-01 is Monday
      expect(getDefaultSemesterStartDate(date(2026, 1, 20))).toBe('2025-09-01')
    })

    it('base is Tuesday -> picks previous Monday (1 day vs 6 days)', () => {
      // 2026-09-01 is Tuesday -> 2026-08-31
      expect(getDefaultSemesterStartDate(date(2026, 9, 1))).toBe('2026-08-31')
    })

    it('base is Sunday -> picks next Monday (1 day vs 6 days)', () => {
      // 2026-03-01 is Sunday -> 2026-03-02
      expect(getDefaultSemesterStartDate(date(2026, 5, 1))).toBe('2026-03-02')
    })

    it('base is Saturday -> picks next Monday (2 days vs 5 days)', () => {
      // 2025-03-01 is Saturday -> 2025-03-03
      expect(getDefaultSemesterStartDate(date(2025, 4, 1))).toBe('2025-03-03')
    })

    it('base is Wednesday -> picks previous Monday (2 days vs 5 days)', () => {
      // 2027-09-01 is Wednesday -> 2027-08-30
      expect(getDefaultSemesterStartDate(date(2027, 10, 1))).toBe('2027-08-30')
    })

    it('base is Thursday -> picks previous Monday (3 days vs 4 days)', () => {
      // 2029-03-01 is Thursday -> 2029-02-26
      expect(getDefaultSemesterStartDate(date(2029, 4, 15))).toBe('2029-02-26')
    })

    it('base is Friday -> picks next Monday (3 days vs 4 days)', () => {
      // 2024-03-01 is Friday -> 2024-03-04
      expect(getDefaultSemesterStartDate(date(2024, 4, 15))).toBe('2024-03-04')
    })
  })

  describe('return value format', () => {
    it('returns YYYY-MM-DD with zero padding', () => {
      const result = getDefaultSemesterStartDate(date(2026, 4, 10))
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result).toBe('2026-03-02')
    })

    it('rolls back the year for January dates', () => {
      const result = getDefaultSemesterStartDate(date(2026, 1, 5))
      expect(result.startsWith('2025-')).toBe(true)
    })

    it('is deterministic for the same input', () => {
      const a = getDefaultSemesterStartDate(date(2026, 10, 7))
      const b = getDefaultSemesterStartDate(date(2026, 10, 7))
      expect(a).toBe(b)
    })
  })

  describe('default argument', () => {
    it('runs without arguments and returns a valid date string', () => {
      const result = getDefaultSemesterStartDate()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
