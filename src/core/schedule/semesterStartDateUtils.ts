export function getDefaultSemesterStartDate(currentDate = new Date()): string {
  // 若当前月份是 1 月，则认为处于秋季学期，设 baseDate 为 9-1
  // 若当前月份 >= 7 月，则认为即将进入秋季学期，设 baseDate 为 9-1
  // 若为 2-6 月，则认为处于春季学期，设 baseDate 为 3-1
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear() - (month === 1 ? 1 : 0)
  const startMonth = month === 1 || month >= 7 ? 9 : 3

  const baseDate = new Date(year, startMonth - 1, 1)

  // 寻找离 baseDate 最近的周一
  const day = baseDate.getDay()
  const daysSinceMonday = (day + 6) % 7
  const daysUntilMonday = (8 - day) % 7

  const resultDateFull = new Date(baseDate)

  if (daysSinceMonday <= daysUntilMonday) {
    resultDateFull.setDate(baseDate.getDate() - daysSinceMonday)
  } else {
    resultDateFull.setDate(baseDate.getDate() + daysUntilMonday)
  }

  const resultYear = resultDateFull.getFullYear()
  const resultMonth = String(resultDateFull.getMonth() + 1).padStart(2, '0')
  const resultDate = String(resultDateFull.getDate()).padStart(2, '0')

  return `${resultYear}-${resultMonth}-${resultDate}`
}
