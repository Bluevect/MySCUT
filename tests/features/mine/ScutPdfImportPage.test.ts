// @vitest-environment jsdom
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScutPdfImportPage, {
  buildScutPdfPreview,
  type PendingScutPdfImport,
  type ScutPdfImportPageServices,
} from '../../../src/features/mine/pages/ScutPdfImportPage'
import type { ScheduleData } from '../../../src/core/schedule/types'

const roots: Root[] = []

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function createScheduleData(): ScheduleData {
  return {
    version: 1,
    source: 'scutPdf',
    importedAt: 1000,
    table: {
      id: 1,
      name: 'TEST-PDF-SCHEDULE',
      campus: 'TEST-CAMPUS',
      school: '华南理工大学',
      maxWeek: 16,
      nodes: 12,
      startDate: '2026-08-31',
      showSat: false,
      showSun: false,
      timeTable: 2,
    },
    timeSlots: [
      { node: 1, startTime: '08:50', endTime: '09:35', timeTable: 2 },
      { node: 2, startTime: '09:40', endTime: '10:25', timeTable: 2 },
    ],
    courses: [
      { id: 1, tableId: 1, name: 'TEST-COURSE-ALPHA', color: '', credit: 3.5, note: '' },
    ],
    lessons: [
      {
        instanceId: 'TEST-LESSON-1',
        courseId: 1,
        tableId: 1,
        day: 1,
        startNode: 1,
        endNode: 2,
        startWeek: 1,
        endWeek: 15,
        weekStep: 2,
        ownTime: false,
        startTime: '',
        endTime: '',
        room: 'TEST-ROOM-A101',
        teacher: 'TEST-TEACHER-A',
        type: 0,
        level: 0,
      },
    ],
    raw: {
      kind: 'scutPdf',
      sourceFileName: 'TEST-schedule.pdf',
      byteLength: 100,
      pageCount: 1,
      pdfjsVersion: 'TEST-PDFJS',
      extractedAt: '2026-08-30T00:00:00.000Z',
      layout: 'scut-student-timetable-v1',
      parserVersion: 1,
    },
  }
}

function createPendingImport(): PendingScutPdfImport {
  return {
    extracted: {
      meta: {
        sourceFileName: 'TEST-schedule.pdf',
        byteLength: 100,
        parsedAt: '2026-08-30T00:00:00.000Z',
        pageCount: 1,
        pdfjsVersion: 'TEST-PDFJS',
      },
      pages: [],
    },
    scheduleData: createScheduleData(),
  }
}

function LocationProbe() {
  return createElement('p', { 'data-testid': 'location' }, useLocation().pathname)
}

async function renderPage(services: ScutPdfImportPageServices) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(createElement(
      MemoryRouter,
      { initialEntries: ['/mine/import-scut-pdf'] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '*',
          element: createElement(
            'div',
            null,
            createElement(ScutPdfImportPage, { services }),
            createElement(LocationProbe),
          ),
        }),
      ),
    ))
    await Promise.resolve()
  })

  return container
}

async function selectFile(container: HTMLElement, fileName = 'TEST-schedule.pdf') {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) {
    throw new Error('file input missing')
  }

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['TEST-PDF'], fileName, { type: 'application/pdf' })],
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.includes(label),
  )
  if (!button) {
    throw new Error(`button missing: ${label}`)
  }
  return button
}

function setFormValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  valueSetter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) {
      await act(async () => root.unmount())
    }
  }
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('ScutPdfImportPage', () => {
  it('builds a pending preview without writing persistent data before confirmation', async () => {
    const services: ScutPdfImportPageServices = {
      parseFile: vi.fn().mockResolvedValue(createPendingImport()),
      saveSchedule: vi.fn().mockResolvedValue({ ok: true }),
      saveThemeId: vi.fn(() => true),
      saveSemesterDate: vi.fn(() => true),
    }
    const container = await renderPage(services)

    await selectFile(container)

    expect(services.saveSchedule).not.toHaveBeenCalled()
    expect(container.textContent).toContain('1 门课程')
    expect(container.textContent).toContain('TEST-COURSE-ALPHA')
    expect(container.textContent).toContain('第 1-15 周（单周）')
    expect(container.textContent).toContain('教师：TEST-TEACHER-A')
    expect(container.textContent).toContain('教室：TEST-ROOM-A101')
    expect(container.textContent).toContain('课表名称')
    expect(container.textContent).toContain('学期开始日期')
    expect(container.textContent).toContain('课表配色')
    expect(container.textContent).toContain('时间表预设')
  })

  it('prevents duplicate saves, preserves the preview after failure, and succeeds on retry', async () => {
    let rejectFirstSave: ((error: Error) => void) | null = null
    const firstSave = new Promise<{ ok: boolean }>((_resolve, reject) => {
      rejectFirstSave = reject
    })
    const saveSchedule = vi.fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce({ ok: true })
    const services: ScutPdfImportPageServices = {
      parseFile: vi.fn().mockResolvedValue(createPendingImport()),
      saveSchedule,
      saveThemeId: vi.fn(() => true),
      saveSemesterDate: vi.fn(() => true),
    }
    const container = await renderPage(services)
    await selectFile(container)

    const textInput = container.querySelector<HTMLInputElement>('input[type="text"]')
    const dateInput = container.querySelector<HTMLInputElement>('input[type="date"]')
    const selects = container.querySelectorAll<HTMLSelectElement>('select')
    if (!textInput || !dateInput || selects.length !== 2) {
      throw new Error('confirmation form missing')
    }

    await act(async () => {
      setFormValue(textInput, 'TEST-CONFIRMED-SCHEDULE')
      setFormValue(dateInput, '2026-09-07')
      setFormValue(selects[0], 'palacePlum')
      setFormValue(selects[1], 'wushan')
    })

    const confirmButton = findButton(container, '确认并导入课表')
    await act(async () => {
      confirmButton.click()
      confirmButton.click()
      await Promise.resolve()
    })
    expect(saveSchedule).toHaveBeenCalledTimes(1)

    await act(async () => {
      rejectFirstSave?.(new Error('TEST-PERSISTENCE-FAILURE'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('TEST-PERSISTENCE-FAILURE')
    expect(container.textContent).toContain('TEST-COURSE-ALPHA')
    expect(container.textContent).toContain('保存失败，识别预览已保留')
    expect(services.saveThemeId).not.toHaveBeenCalled()

    await act(async () => {
      findButton(container, '确认并导入课表').click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(saveSchedule).toHaveBeenCalledTimes(2)
    expect(saveSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        table: expect.objectContaining({
          name: 'TEST-CONFIRMED-SCHEDULE',
          startDate: '2026-09-07',
        }),
      }),
      expect.objectContaining({
        preferredName: 'TEST-CONFIRMED-SCHEDULE',
        semesterStartDate: '2026-09-07',
        themeId: 'palacePlum',
        timeSlotPresetId: 'wushan',
        setActive: true,
      }),
    )
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/courses')
  })

  it('clears confirmation when a newly selected PDF is rejected', async () => {
    const services: ScutPdfImportPageServices = {
      parseFile: vi.fn()
        .mockResolvedValueOnce(createPendingImport())
        .mockRejectedValueOnce(new Error('不支持的华工课表 PDF 格式：固定标题缺失')),
      saveSchedule: vi.fn().mockResolvedValue({ ok: true }),
      saveThemeId: vi.fn(() => true),
      saveSemesterDate: vi.fn(() => true),
    }
    const container = await renderPage(services)

    await selectFile(container, 'TEST-first.pdf')
    expect(container.textContent).toContain('TEST-COURSE-ALPHA')

    await selectFile(container, 'TEST-unsupported.pdf')
    expect(container.textContent).toContain('不支持的华工课表 PDF 格式：固定标题缺失')
    expect(container.textContent).not.toContain('TEST-COURSE-ALPHA')
    expect(Array.from(container.querySelectorAll('button')).some(
      (button) => button.textContent?.includes('确认并导入课表'),
    )).toBe(false)
  })

  it('reports actionable time-slot warnings in the preview model', () => {
    const scheduleData = createScheduleData()
    scheduleData.lessons[0].endNode = 12

    expect(buildScutPdfPreview(scheduleData).warnings).toEqual([
      '有 1 个上课时段没有匹配的起止时间，保存后请在课表设置中选择合适的时间表。',
    ])
  })
})
