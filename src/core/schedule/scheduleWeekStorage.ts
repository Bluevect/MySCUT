const SCHEDULE_WEEK_STORAGE_KEY = 'scheduleWeekStorage'

export function getScheduleWeekStorage() {
  try {
    return localStorage.getItem(SCHEDULE_WEEK_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setScheduleWeekStorage(enabled: boolean) {
  try {
    localStorage.setItem(SCHEDULE_WEEK_STORAGE_KEY, enabled ? '1' : '0')
    return true
  } catch {
    return false
  }
}