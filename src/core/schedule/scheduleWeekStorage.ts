const SCHEDULE_WEEK_STORAGE_KEY = 'scheduleWeekStorage'

export function getScheduleWeekStorage() {
  try {
    const storedValue = localStorage.getItem(SCHEDULE_WEEK_STORAGE_KEY)
    return storedValue !== '0'
  } catch {
    return true
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