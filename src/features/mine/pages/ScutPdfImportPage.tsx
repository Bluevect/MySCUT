import { CloseOutlined } from '@ant-design/icons'
import { type ChangeEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { SinglePendingOperation } from '../../../core/async/singlePendingOperation'
import {
  extractScutSchedulePdf,
  parseScutSchedulePdfContract,
  type ExtractedSchedulePdf,
} from '../../../core/schedule/importScutPdf'
import { mapScutSchedulePdf } from '../../../core/schedule/mapScutSchedulePdf'
import {
  saveScheduleDataWithOptions,
  type SaveScheduleOptions,
} from '../../../core/schedule/storage'
import {
  getScheduleThemePreset,
  setScheduleThemeId,
} from '../../../core/schedule/themeStorage'
import {
  SCHEDULE_THEME_PRESETS,
  type ScheduleThemeId,
} from '../../../core/schedule/themePresets'
import {
  getTimeSlotPresetName,
  TIME_SLOT_PRESET_OPTIONS,
} from '../../../core/schedule/timeSlotPresets'
import type { ScheduleData, ScheduleLesson, TimeSlotPresetId } from '../../../core/schedule/types'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

const weekdayLabels = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

export type PendingScutPdfImport = {
  extracted: ExtractedSchedulePdf
  scheduleData: ScheduleData
}

export type ScutPdfImportPageServices = {
  parseFile: (file: File, semesterStartDate: string) => Promise<PendingScutPdfImport>
  saveSchedule: (
    scheduleData: ScheduleData,
    options: SaveScheduleOptions,
  ) => Promise<{ ok: boolean }>
  saveThemeId: (themeId: ScheduleThemeId) => boolean
  saveSemesterDate: (dateText: string) => boolean
}

type ScutPdfImportPageProps = {
  services?: ScutPdfImportPageServices
}

function formatWeekRange(lesson: ScheduleLesson) {
  const range = lesson.startWeek === lesson.endWeek
    ? `第 ${lesson.startWeek} 周`
    : `第 ${lesson.startWeek}-${lesson.endWeek} 周`

  if (lesson.weekStep === 2) {
    return `${range}（${lesson.startWeek % 2 === 1 ? '单周' : '双周'}）`
  }

  if (lesson.weekStep > 2) {
    return `${range}（每 ${lesson.weekStep} 周）`
  }

  return range
}

function formatNodeRange(lesson: ScheduleLesson) {
  return lesson.startNode === lesson.endNode
    ? `第 ${lesson.startNode} 节`
    : `第 ${lesson.startNode}-${lesson.endNode} 节`
}

export function buildScutPdfPreview(scheduleData: ScheduleData) {
  const coveredNodes = new Set(scheduleData.timeSlots.map((slot) => slot.node))
  const uncoveredLessons = scheduleData.lessons.filter((lesson) => (
    !coveredNodes.has(lesson.startNode) || !coveredNodes.has(lesson.endNode)
  ))
  const warnings = uncoveredLessons.length > 0
    ? [`有 ${uncoveredLessons.length} 个上课时段没有匹配的起止时间，保存后请在课表设置中选择合适的时间表。`]
    : []

  return {
    courseCount: scheduleData.courses.length,
    lessonCount: scheduleData.lessons.length,
    warnings,
    courses: scheduleData.courses.map((course) => ({
      ...course,
      lessons: scheduleData.lessons.filter((lesson) => lesson.courseId === course.id),
    })),
  }
}

export async function parseScutPdfImportFile(file: File, semesterStartDate: string) {
  const extracted = await extractScutSchedulePdf(file)
  const contract = parseScutSchedulePdfContract(extracted)
  const scheduleData = mapScutSchedulePdf(contract, extracted.meta, {
    semesterStartDate,
  })

  return {
    extracted,
    scheduleData,
  }
}

const defaultServices: ScutPdfImportPageServices = {
  parseFile: parseScutPdfImportFile,
  saveSchedule: saveScheduleDataWithOptions,
  saveThemeId: setScheduleThemeId,
  saveSemesterDate: saveSemesterStartDate,
}

function ScutPdfImportPage({ services = defaultServices }: ScutPdfImportPageProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parseOperationRef = useRef(new SinglePendingOperation())
  const saveOperationRef = useRef(new SinglePendingOperation())
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parseError, setParseError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [statusText, setStatusText] = useState('请选择华工教务导出的课表 PDF')
  const [pendingImport, setPendingImport] = useState<PendingScutPdfImport | null>(null)
  const [scheduleName, setScheduleName] = useState('')
  const [semesterStartDate, setSemesterStartDate] = useState(() => getSemesterStartDate())
  const [themeId, setThemeId] = useState<ScheduleThemeId>(() => getScheduleThemePreset().id)
  const [timeSlotPresetId, setTimeSlotPresetId] = useState<TimeSlotPresetId>('builtIn')
  const isBusy = isParsing || isSaving
  const preview = pendingImport ? buildScutPdfPreview(pendingImport.scheduleData) : null

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
  }

  const handleChoosePdf = () => {
    if (!isBusy) {
      fileInputRef.current?.click()
    }
  }

  const handleDownloadJson = () => {
    if (!import.meta.env.DEV || !pendingImport) {
      return
    }

    const extractedJson = JSON.stringify(pendingImport.extracted, null, 2)
    const blob = new Blob([extractedJson], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `scut-pdf-extracted-${Date.now()}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const handleSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) {
      return
    }

    setPendingImport(null)
    setParseError('')
    setSaveError('')

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setParseError('请选择扩展名为 .pdf 的课表文件')
      setStatusText('文件格式不受支持')
      input.value = ''
      return
    }

    setStatusText(`正在识别 ${file.name}`)

    try {
      const result = await parseOperationRef.current.run(
        () => services.parseFile(file, semesterStartDate),
        setIsParsing,
      )
      if (!result.started) {
        return
      }

      const nextPreview = buildScutPdfPreview(result.value.scheduleData)
      setPendingImport(result.value)
      setScheduleName(result.value.scheduleData.table.name)
      setStatusText(`识别完成：${nextPreview.courseCount} 门课程，${nextPreview.lessonCount} 个上课安排`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF 识别失败'
      setPendingImport(null)
      setParseError(errorMessage)
      setStatusText('识别失败，未生成待确认课表')
    } finally {
      input.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) {
      return
    }

    const preferredName = scheduleName.trim()
    if (!preferredName) {
      setSaveError('请填写课表名称')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(semesterStartDate)) {
      setSaveError('请选择有效的学期开始日期')
      return
    }

    setSaveError('')

    try {
      const result = await saveOperationRef.current.run(async () => {
        const scheduleData: ScheduleData = {
          ...pendingImport.scheduleData,
          table: {
            ...pendingImport.scheduleData.table,
            name: preferredName,
            startDate: semesterStartDate,
          },
          raw: pendingImport.scheduleData.raw,
        }
        const saveResult = await services.saveSchedule(scheduleData, {
          themeId,
          timeSlotPresetId,
          semesterStartDate,
          preferredName,
          setActive: true,
        })
        if (!saveResult.ok) {
          throw new Error('课表保存失败，请稍后重试')
        }

        const defaultsSaved = services.saveThemeId(themeId) && services.saveSemesterDate(semesterStartDate)
        const timeSlotName = getTimeSlotPresetName(timeSlotPresetId)
        navigate('/courses', {
          replace: true,
          state: {
            message: defaultsSaved
              ? `华工教务 PDF 课表已导入，已应用${timeSlotName}`
              : `课表已导入，${timeSlotName}已绑定；默认设置写入失败，请稍后在课表设置中确认`,
          },
        })
      }, setIsSaving)

      if (!result.started) {
        return
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课表保存失败，请稍后重试'
      setSaveError(errorMessage)
      setStatusText('保存失败，识别预览已保留，可修改设置后重试')
    }
  }

  return (
    <section className='schedule-settings-page schedule-pdf-import-page' aria-busy={isBusy}>
      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>从华工教务 PDF 导入</p>
          <p className='schedule-settings-subtitle'>先识别预览，确认后才保存到本机</p>
        </div>

        <CircleIconButton
          ariaLabel='关闭页面'
          icon={<CloseOutlined />}
          onClick={handleClose}
        />
      </header>

      <div className='schedule-settings-content'>
        <section className='schedule-pdf-intro-card' aria-labelledby='schedule-pdf-select-title'>
          <div>
            <h2 id='schedule-pdf-select-title'>选择课表文件</h2>
            <p>仅支持固定华工教务布局、带可选择文本的单页 PDF。扫描件和未知布局不会保存。</p>
          </div>
          <button
            type='button'
            className='schedule-pdf-primary-button'
            onClick={handleChoosePdf}
            disabled={isBusy}
          >
            {isParsing ? '正在识别...' : pendingImport ? '重新选择 PDF' : '选择 PDF'}
          </button>
        </section>

        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf'
          className='schedule-settings-file-input'
          disabled={isBusy}
          onChange={(event) => {
            void handleSelectFile(event)
          }}
        />

        <p className='schedule-pdf-status' role='status' aria-live='polite'>{statusText}</p>
        {parseError && <p className='schedule-pdf-error' role='alert'>{parseError}</p>}

        {preview && pendingImport && (
          <>
            <section className='schedule-pdf-preview-card' aria-labelledby='schedule-pdf-preview-title'>
              <div className='schedule-pdf-section-heading'>
                <div>
                  <p className='schedule-pdf-eyebrow'>识别预览</p>
                  <h2 id='schedule-pdf-preview-title'>请核对课程与上课安排</h2>
                </div>
                <span className='schedule-pdf-source-badge'>华工教务 PDF</span>
              </div>

              <div className='schedule-pdf-summary-grid' aria-label='识别结果统计'>
                <div className='schedule-pdf-stat'>
                  <strong>{preview.courseCount}</strong>
                  <span>门课程</span>
                </div>
                <div className='schedule-pdf-stat'>
                  <strong>{preview.lessonCount}</strong>
                  <span>个上课安排</span>
                </div>
                <div className='schedule-pdf-stat'>
                  <strong>{pendingImport.scheduleData.table.maxWeek}</strong>
                  <span>周范围</span>
                </div>
              </div>

              {preview.warnings.length > 0 ? (
                <ul className='schedule-pdf-warning-list' aria-label='识别提醒'>
                  {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : (
                <p className='schedule-pdf-ready-note'>未发现阻止导入的问题。仍请逐项核对课程、周次、教师和教室。</p>
              )}

              <div className='schedule-pdf-course-list'>
                {preview.courses.map((course) => (
                  <article key={course.id} className='schedule-pdf-course-card'>
                    <div className='schedule-pdf-course-heading'>
                      <h3>{course.name}</h3>
                      <span>{course.credit} 学分</span>
                    </div>
                    <ul className='schedule-pdf-lesson-list'>
                      {course.lessons.map((lesson) => (
                        <li key={lesson.instanceId}>
                          <strong>{weekdayLabels[lesson.day - 1]} · {formatNodeRange(lesson)}</strong>
                          <span>{formatWeekRange(lesson)}</span>
                          <span>教师：{lesson.teacher}</span>
                          <span>教室：{lesson.room}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className='schedule-pdf-confirm-card' aria-labelledby='schedule-pdf-confirm-title'>
              <div className='schedule-pdf-section-heading'>
                <div>
                  <p className='schedule-pdf-eyebrow'>保存设置</p>
                  <h2 id='schedule-pdf-confirm-title'>确认后写入课表库</h2>
                </div>
              </div>

              <div className='schedule-pdf-form-grid'>
                <label className='schedule-pdf-field'>
                  <span>课表名称</span>
                  <input
                    type='text'
                    value={scheduleName}
                    onChange={(event) => setScheduleName(event.target.value)}
                    disabled={isSaving}
                  />
                </label>

                <label className='schedule-pdf-field'>
                  <span>学期开始日期</span>
                  <input
                    type='date'
                    value={semesterStartDate}
                    onChange={(event) => setSemesterStartDate(event.target.value)}
                    disabled={isSaving}
                  />
                </label>

                <label className='schedule-pdf-field'>
                  <span>课表配色</span>
                  <select
                    value={themeId}
                    onChange={(event) => setThemeId(event.target.value as ScheduleThemeId)}
                    disabled={isSaving}
                  >
                    {SCHEDULE_THEME_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </label>

                <label className='schedule-pdf-field'>
                  <span>时间表预设</span>
                  <select
                    value={timeSlotPresetId}
                    onChange={(event) => setTimeSlotPresetId(event.target.value as TimeSlotPresetId)}
                    disabled={isSaving}
                  >
                    {TIME_SLOT_PRESET_OPTIONS.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {saveError && <p className='schedule-pdf-error' role='alert'>{saveError}</p>}
              <button
                type='button'
                className='schedule-pdf-primary-button schedule-pdf-confirm-button'
                onClick={() => {
                  void handleConfirmImport()
                }}
                disabled={isBusy || !scheduleName.trim() || !semesterStartDate}
              >
                {isSaving ? '正在保存...' : '确认并导入课表'}
              </button>
            </section>

            {import.meta.env.DEV && (
              <aside className='schedule-pdf-developer-card' aria-label='开发者诊断工具'>
                <div>
                  <strong>开发者诊断</strong>
                  <p>抽取 JSON 可能包含完整课表数据。仅用于本地排查，不要上传、提交或分享。</p>
                </div>
                <button type='button' onClick={handleDownloadJson} disabled={isBusy}>下载抽取 JSON</button>
              </aside>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default ScutPdfImportPage
