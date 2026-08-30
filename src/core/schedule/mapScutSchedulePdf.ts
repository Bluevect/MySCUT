import { DEFAULT_SCUT_TIME_SLOTS } from './defaultTimeSlots'
import {
  SCUT_PDF_FIXED_LAYOUT,
  type ExtractedSchedulePdf,
  type ScutPdfLessonContract,
  type ScutSchedulePdfContract,
} from './importScutPdf'
import { normalizeWakeupStartDate } from './importWakeup'
import type { ScheduleCourse, ScheduleData, ScheduleLesson } from './types'

export type MapScutSchedulePdfOptions = {
  semesterStartDate: string
  importedAt?: number
}

function createMappingError(detail: string) {
  return new Error(`华工课表 PDF 映射失败：${detail}`)
}

function requireText(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createMappingError(`缺少${fieldName}`)
  }

  return value.trim()
}

function validateLesson(lesson: ScutPdfLessonContract) {
  if (!Number.isInteger(lesson.day) || lesson.day < 1 || lesson.day > 7) {
    throw createMappingError('课程星期字段无效')
  }

  if (
    !Number.isInteger(lesson.startNode)
    || !Number.isInteger(lesson.endNode)
    || lesson.startNode < 1
    || lesson.endNode < lesson.startNode
    || lesson.endNode > SCUT_PDF_FIXED_LAYOUT.table.nodeCount
  ) {
    throw createMappingError('课程节次字段无效')
  }

  const courseName = requireText(lesson.courseName, '课程名称')
  const teacher = requireText(lesson.teacher, `课程“${courseName}”的教师`)
  const room = requireText(lesson.room, `课程“${courseName}”的教室`)
  requireText(lesson.weekExpression, `课程“${courseName}”的周次`)

  if (!Number.isFinite(lesson.credit) || lesson.credit <= 0) {
    throw createMappingError(`课程“${courseName}”的学分无效`)
  }

  if (!Array.isArray(lesson.weekRanges) || lesson.weekRanges.length === 0) {
    throw createMappingError(`课程“${courseName}”缺少周次范围`)
  }

  lesson.weekRanges.forEach((range) => {
    if (
      !Number.isInteger(range.startWeek)
      || !Number.isInteger(range.endWeek)
      || !Number.isInteger(range.weekStep)
      || range.startWeek < 1
      || range.endWeek < range.startWeek
      || range.weekStep < 1
    ) {
      throw createMappingError(`课程“${courseName}”的周次范围无效`)
    }
  })

  return {
    courseName,
    teacher,
    room,
  }
}

export function mapScutSchedulePdf(
  contract: ScutSchedulePdfContract,
  extractionMeta: ExtractedSchedulePdf['meta'],
  options: MapScutSchedulePdfOptions,
): ScheduleData {
  if (contract.version !== 1 || contract.layout !== SCUT_PDF_FIXED_LAYOUT.id) {
    throw createMappingError('布局合约版本不受支持')
  }

  const academicYear = requireText(contract.academicYear, '学年')
  const studentIdentifier = requireText(contract.studentIdentifier, '学生标识')
  const campus = requireText(contract.campus, '校区')
  requireText(contract.scheduleIdentifier, '课表编号')

  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    throw createMappingError('学年格式无效')
  }

  if (!Number.isInteger(contract.semester) || contract.semester < 1 || contract.semester > 3) {
    throw createMappingError('学期字段无效')
  }

  if (!Array.isArray(contract.lessons) || contract.lessons.length === 0) {
    throw createMappingError('课表中没有课程')
  }

  if (
    typeof extractionMeta.sourceFileName !== 'string'
    || extractionMeta.sourceFileName.trim().length === 0
    || !Number.isFinite(extractionMeta.byteLength)
    || extractionMeta.byteLength <= 0
    || extractionMeta.pageCount !== 1
    || typeof extractionMeta.pdfjsVersion !== 'string'
    || extractionMeta.pdfjsVersion.trim().length === 0
  ) {
    throw createMappingError('PDF 提取诊断信息不完整')
  }

  const courseByName = new Map<string, ScheduleCourse>()
  const lessons: ScheduleLesson[] = []

  contract.lessons.forEach((contractLesson, lessonIndex) => {
    const { courseName, teacher, room } = validateLesson(contractLesson)
    let course = courseByName.get(courseName)
    if (!course) {
      course = {
        id: courseByName.size + 1,
        tableId: 1,
        name: courseName,
        color: '',
        credit: contractLesson.credit,
        note: '',
      }
      courseByName.set(courseName, course)
    } else if (Math.abs(course.credit - contractLesson.credit) > 0.0001) {
      throw createMappingError(`课程“${courseName}”存在冲突的学分信息`)
    }

    contractLesson.weekRanges.forEach((range, rangeIndex) => {
      lessons.push({
        instanceId: `scut-pdf-${contractLesson.day}-${contractLesson.startNode}-${contractLesson.endNode}-${range.startWeek}-${range.endWeek}-${range.weekStep}-${lessonIndex}-${rangeIndex}`,
        courseId: course.id,
        tableId: 1,
        day: contractLesson.day,
        startNode: contractLesson.startNode,
        endNode: contractLesson.endNode,
        startWeek: range.startWeek,
        endWeek: range.endWeek,
        weekStep: range.weekStep,
        ownTime: false,
        startTime: '',
        endTime: '',
        room,
        teacher,
        detailText: `周次：${contractLesson.weekExpression} | 教师：${teacher} | 地点：${room} | 学分：${contractLesson.credit}`,
        type: 0,
        level: 0,
      })
    })
  })

  const maxWeek = lessons.reduce((maximum, lesson) => Math.max(maximum, lesson.endWeek), 1)
  const importedAt = options.importedAt ?? Date.now()
  if (!Number.isFinite(importedAt) || importedAt < 0) {
    throw createMappingError('导入时间无效')
  }

  return {
    version: 1,
    source: 'scutPdf',
    importedAt,
    table: {
      id: 1,
      name: `${studentIdentifier}的课表（${academicYear}学年第${contract.semester}学期）`,
      campus,
      school: '华南理工大学',
      maxWeek,
      nodes: SCUT_PDF_FIXED_LAYOUT.table.nodeCount,
      startDate: normalizeWakeupStartDate(options.semesterStartDate),
      showSat: lessons.some((lesson) => lesson.day === 6),
      showSun: lessons.some((lesson) => lesson.day === 7),
      timeTable: 2,
    },
    timeSlots: DEFAULT_SCUT_TIME_SLOTS.map((slot) => ({ ...slot })),
    courses: Array.from(courseByName.values()),
    lessons,
    raw: {
      kind: 'scutPdf',
      sourceFileName: extractionMeta.sourceFileName,
      byteLength: extractionMeta.byteLength,
      pageCount: extractionMeta.pageCount,
      pdfjsVersion: extractionMeta.pdfjsVersion,
      extractedAt: extractionMeta.parsedAt,
      layout: SCUT_PDF_FIXED_LAYOUT.id,
      parserVersion: 1,
    },
  }
}
