export function getDefaultSemesterStartDate(currentDate = new Date()): string {
	const month = currentDate.getMonth() + 1
	const year = currentDate.getFullYear() - (month === 1 ? 1 : 0)
	const startMonth = month === 1 || month >= 7 ? 9 : 3

	return `${year}-${String(startMonth).padStart(2, '0')}-01`
}