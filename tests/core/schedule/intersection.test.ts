import { describe, expect, it } from 'vitest'
import {
  buildIntersectionSchedule,
  type IntersectionDisplayMode,
  type IntersectionParticipant,
} from '../../../src/core/schedule/intersection'
import type {
  ScheduleData,
  ScheduleLesson,
  TimeSlotPresetId,
  WakeupTimeSlot,
} from '../../../src/core/schedule/types'

type LessonInput = Pick<
  ScheduleLesson,
  'day' | 'startNode' | 'endNode' | 'startWeek' | 'endWeek' | 'weekStep'
>

const builtInUniversityTownSlots: WakeupTimeSlot[] = [
  { node: 1, startTime: '08:50', endTime: '09:35', timeTable: 2 },
  { node: 2, startTime: '09:40', endTime: '10:25', timeTable: 2 },
]

function createScheduleData(name: string, lessons: LessonInput[], maxWeek = 4): ScheduleData {
  return {
    version: 1,
    source: 'scutHtml',
    importedAt: 100,
    table: {
      id: 1,
      name: `TEST-${name}-SCHEDULE`,
      campus: `TEST-${name}-CAMPUS`,
      school: 'TEST-UNIVERSITY',
      maxWeek,
      nodes: 11,
      startDate: '2026-08-31',
      showSat: true,
      showSun: true,
      timeTable: 2,
    },
    timeSlots: builtInUniversityTownSlots,
    courses: [{
      id: 1,
      tableId: 1,
      name: `TEST-${name}-COURSE`,
      color: '#123456',
      credit: 1,
      note: '',
    }],
    lessons: lessons.map((lesson, index) => ({
      instanceId: `TEST-${name}-LESSON-${index + 1}`,
      courseId: 1,
      tableId: 1,
      ...lesson,
      ownTime: false,
      startTime: '',
      endTime: '',
      room: `TEST-${name}-ROOM`,
      teacher: `TEST-${name}-TEACHER`,
      type: 0,
      level: 0,
    })),
    raw: {
      kind: 'scutHtml',
      html: '',
    },
  }
}

function createParticipant(
  name: string,
  timeSlotPresetId: TimeSlotPresetId,
  lessons: LessonInput[],
  maxWeek = 4,
): IntersectionParticipant {
  return {
    name,
    timeSlotPresetId,
    scheduleData: createScheduleData(name, lessons, maxWeek),
  }
}

function getIntersectionCell(
  scheduleData: ScheduleData,
  week: number,
  startTime: string,
  endTime: string,
  day = 1,
) {
  const lesson = scheduleData.lessons.find((candidate) => (
    candidate.startWeek === week &&
    candidate.day === day &&
    candidate.startTime === startTime &&
    candidate.endTime === endTime
  ))
  if (!lesson) {
    throw new Error(`intersection cell missing: week ${week}, ${startTime}-${endTime}`)
  }

  const course = scheduleData.courses.find((candidate) => candidate.id === lesson.courseId)
  if (!course) {
    throw new Error(`intersection course missing: ${lesson.courseId}`)
  }

  return { course, lesson }
}

function buildByMode(participants: IntersectionParticipant[], mode: IntersectionDisplayMode) {
  return buildIntersectionSchedule(participants, mode, `TEST-${mode}-INTERSECTION`)
}

describe('buildIntersectionSchedule', () => {
  it('maps partial and full overlap across presets for multiple participants and multi-node lessons', () => {
    const participants = [
      createParticipant('TEST-A', 'wushan', [{
        day: 1,
        startNode: 1,
        endNode: 2,
        startWeek: 1,
        endWeek: 1,
        weekStep: 1,
      }], 1),
      createParticipant('TEST-B', 'universityTown', [{
        day: 1,
        startNode: 1,
        endNode: 1,
        startWeek: 1,
        endWeek: 1,
        weekStep: 1,
      }], 1),
      createParticipant('TEST-C', 'builtIn', [{
        day: 1,
        startNode: 1,
        endNode: 1,
        startWeek: 1,
        endWeek: 1,
        weekStep: 1,
      }], 1),
    ]

    const result = buildByMode(participants, 'default')
    const wushanOnlyPrefix = getIntersectionCell(result, 1, '08:00', '08:45')
    const wushanOnlyBoundary = getIntersectionCell(result, 1, '08:45', '08:50')
    const fullOverlap = getIntersectionCell(result, 1, '08:50', '08:55')
    const fullOverlapMiddle = getIntersectionCell(result, 1, '08:55', '09:35')
    const wushanOnlySuffix = getIntersectionCell(result, 1, '09:35', '09:40')

    expect(wushanOnlyPrefix.course.name).toBe('没空：TEST-A')
    expect(wushanOnlyBoundary.course.name).toBe('没空：TEST-A')
    expect(fullOverlap.course.name).toBe('有空：无')
    expect(fullOverlapMiddle.course.name).toBe('有空：无')
    expect(wushanOnlySuffix.course.name).toBe('没空：TEST-A')
    expect(fullOverlap.lesson).toMatchObject({
      startNode: 3,
      endNode: 3,
      startWeek: 1,
      endWeek: 1,
      startTime: '08:50',
      endTime: '08:55',
      type: 99,
    })
    expect(result.table).toMatchObject({
      name: 'TEST-default-INTERSECTION',
      campus: '并集预设',
      maxWeek: 1,
      timeTable: 9004,
    })
  })

  it('honors odd/even weeks and emits exact labels and colors for every display mode', () => {
    const participants = [
      createParticipant('TEST-A', 'wushan', [{
        day: 1,
        startNode: 1,
        endNode: 1,
        startWeek: 1,
        endWeek: 3,
        weekStep: 2,
      }]),
      createParticipant('TEST-B', 'wushan', [{
        day: 1,
        startNode: 1,
        endNode: 1,
        startWeek: 2,
        endWeek: 2,
        weekStep: 1,
      }]),
    ]

    const availableOnly = buildByMode(participants, 'availableOnly')
    expect(getIntersectionCell(availableOnly, 1, '08:00', '08:45').course.name).toBe('TEST-B')
    expect(getIntersectionCell(availableOnly, 2, '08:00', '08:45').course.name).toBe('TEST-A')
    expect(getIntersectionCell(availableOnly, 3, '08:00', '08:45').course.name).toBe('TEST-B')
    expect(getIntersectionCell(availableOnly, 4, '08:00', '08:45').course.name).toBe('TEST-A TEST-B')

    const unavailableOnly = buildByMode(participants, 'unavailableOnly')
    expect(getIntersectionCell(unavailableOnly, 1, '08:00', '08:45').course).toMatchObject({
      name: 'TEST-A',
      color: '#d4380d',
    })
    expect(getIntersectionCell(unavailableOnly, 2, '08:00', '08:45').course).toMatchObject({
      name: 'TEST-B',
      color: '#d4380d',
    })
    expect(getIntersectionCell(unavailableOnly, 4, '08:00', '08:45').course).toMatchObject({
      name: '都有空',
      color: '#52c41a',
    })

    const defaultMode = buildByMode(participants, 'default')
    expect(getIntersectionCell(defaultMode, 1, '08:00', '08:45').course.name).toBe('有空：TEST-B')
    expect(getIntersectionCell(defaultMode, 2, '08:00', '08:45').course.name).toBe('有空：TEST-A')
    expect(getIntersectionCell(defaultMode, 4, '08:00', '08:45').course.name).toBe('没空：无')
  })
})
