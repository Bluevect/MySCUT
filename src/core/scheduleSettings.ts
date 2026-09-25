import { getDefaultSemesterStartDate } from './schedule/semesterStartDateUtils'

const SEMESTER_START_DATE_STORAGE_KEY = 'semesterStartDate'

export const DEFAULT_TIME_SLOT = 'universityTown'

function isValidDateText(dateText: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText)
}

export function getSemesterStartDate() {
  try {
    const storedDate = localStorage.getItem(SEMESTER_START_DATE_STORAGE_KEY)
    if (!storedDate) {
      return getDefaultSemesterStartDate()
    }

    if (isValidDateText(storedDate)) {
      return storedDate
    }

    return getDefaultSemesterStartDate()
  } catch {
    return getDefaultSemesterStartDate()
  }
}

export function saveSemesterStartDate(dateText: string) {
  if (!isValidDateText(dateText)) {
    return false
  }

  try {
    localStorage.setItem(SEMESTER_START_DATE_STORAGE_KEY, dateText)
    return true
  } catch {
    return false
  }
}
