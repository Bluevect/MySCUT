import { LeftOutlined } from '@ant-design/icons'
import { Button, Input, InputNumber, Select, message } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTE_PATHS } from '../../app/routePaths'
import { TransparentIconButton } from '../../components/buttons/TransparentIconButton'
import { loadActiveScheduleEntry, updateActiveScheduleData } from '../../core/schedule/storage'
import type { ScheduleCourse, ScheduleData, ScheduleLesson } from '../../core/schedule/types'

type DayValue = 1 | 2 | 3 | 4 | 5 | 6 | 7

const WEEKDAY_OPTIONS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

function AddCoursesPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const activeSchedule = useMemo(() => loadActiveScheduleEntry(), [])
  const scheduleData = activeSchedule?.scheduleData ?? null
  const maxNode = scheduleData?.table.nodes ?? 12
  const maxWeek = scheduleData?.table.maxWeek ?? 20

  const [courseName, setCourseName] = useState('新课程')
  const [day, setDay] = useState<DayValue>(1)
  const [startNode, setStartNode] = useState<number | null>(1)
  const [endNode, setEndNode] = useState<number | null>(2)
  const [startWeek, setStartWeek] = useState<number | null>(1)
  const [endWeek, setEndWeek] = useState<number | null>(maxWeek)
  const [classroom, setClassroom] = useState('待定教室')
  const [teacher, setTeacher] = useState('待定老师')
  const [detailText, setDetailText] = useState('')
  const [credit, setCredit] = useState<number | null>(0)
  const [isSaving, setIsSaving] = useState(false)

  function handleReturn() {
    navigate(APP_ROUTE_PATHS.courses)
  }

  async function handleSave() {
    if (!scheduleData) {
      messageApi.error('请先导入或选择一个课表后再添加课程')
      return
    }

    const normalizedName = courseName.trim() || '新课程'
    const normalizedRoom = classroom.trim() || '待定教室'
    const normalizedTeacher = teacher.trim() || '待定老师'

    const safeStartNode = Math.max(1, Math.min(maxNode, Number(startNode ?? 1)))
    const safeEndNode = Math.max(safeStartNode, Math.min(maxNode, Number(endNode ?? safeStartNode)))
    const safeStartWeek = Math.max(1, Math.min(maxWeek, Number(startWeek ?? 1)))
    const safeEndWeek = Math.max(safeStartWeek, Math.min(maxWeek, Number(endWeek ?? safeStartWeek)))

    if (safeEndNode < safeStartNode) {
      messageApi.error('结束节数不能小于起始节数')
      return
    }

    if (safeEndWeek < safeStartWeek) {
      messageApi.error('结束周数不能小于起始周数')
      return
    }

    if (credit === null || !Number.isFinite(credit) || credit < 0) {
      messageApi.error('学分必须是大于或等于 0 的数字')
      return
    }

    try {
      setIsSaving(true)

      const nextCourseId =
        scheduleData.courses.reduce((maxId, course) => Math.max(maxId, course.id), 0) + 1

      const nextCourse: ScheduleCourse = {
        id: nextCourseId,
        tableId: scheduleData.table.id,
        name: normalizedName,
        color: '',
        credit: credit ?? 0,
        note: '',
      }

      const timeSlotMap = new Map(
        scheduleData.timeSlots.map((timeSlot) => [timeSlot.node, timeSlot] as const),
      )
      const startTimeSlot = timeSlotMap.get(safeStartNode)
      const endTimeSlot = timeSlotMap.get(safeEndNode)

      const nextLesson: ScheduleLesson = {
        instanceId: `custom-${day}-${safeStartNode}-${safeEndNode}-${safeStartWeek}-${safeEndWeek}-${nextCourseId}`,
        courseId: nextCourseId,
        tableId: scheduleData.table.id,
        day,
        startNode: safeStartNode,
        endNode: safeEndNode,
        startWeek: safeStartWeek,
        endWeek: safeEndWeek,
        weekStep: 1,
        ownTime: false,
        startTime: startTimeSlot?.startTime ?? '',
        endTime: endTimeSlot?.endTime ?? '',
        room: normalizedRoom,
        teacher: normalizedTeacher,
        detailText: detailText.trim(),
        type: 0,
        level: 0,
      }

      const nextScheduleData: ScheduleData = {
        ...scheduleData,
        importedAt: Date.now(),
        courses: scheduleData.courses.some(c => c.name === nextCourse.name)
          ? scheduleData.courses
          : [...scheduleData.courses, nextCourse],
        lessons: [...scheduleData.lessons, nextLesson],
      }

      const updated = await updateActiveScheduleData(nextScheduleData)
      if (!updated) {
        throw new Error('当前课表已不存在，请返回课程列表后重试')
      }

      navigate(APP_ROUTE_PATHS.courses, {
        state: { message: `课程“${normalizedName}”已添加` },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课程添加失败'
      messageApi.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='add-courses-page'>
      {contextHolder}
      <header className='add-courses-header'>
        <div className='add-courses-left-panel'>
          <TransparentIconButton
            ariaLabel='返回'
            icon={<LeftOutlined />}
            onClick={handleReturn}
          />
        </div>

        <div className='add-courses-title'>添加课程</div>
      </header>

      <div className='add-courses-content'>
        <div className='add-courses-form-card'>
          <div className='add-courses-form-grid'>
            <div className='add-courses-field'>
              <span className='add-courses-label'>课程名称</span>
              <Input
                size='large'
                placeholder='课程名称'
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>上课时间（星期）</span>
              <Select
                size='large'
                style={{ width: '100%' }}
                options={WEEKDAY_OPTIONS}
                value={day}
                onChange={(value) => setDay(value as DayValue)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>节数</span>
              <div className='add-courses-range'>
                <label className='add-courses-range-field'>
                  <span>从</span>
                  <InputNumber
                    min={1}
                    max={maxNode}
                    size='large'
                    style={{ width: '100%' }}
                    value={startNode}
                    onChange={setStartNode}
                  />
                </label>
                <label className='add-courses-range-field'>
                  <span>到</span>
                  <InputNumber
                    min={1}
                    max={maxNode}
                    size='large'
                    style={{ width: '100%' }}
                    value={endNode}
                    onChange={setEndNode}
                  />
                </label>
              </div>
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>周数</span>
              <div className='add-courses-range'>
                <label className='add-courses-range-field'>
                  <span>从</span>
                  <InputNumber
                    min={1}
                    max={maxWeek}
                    size='large'
                    style={{ width: '100%' }}
                    value={startWeek}
                    onChange={setStartWeek}
                  />
                </label>
                <label className='add-courses-range-field'>
                  <span>到</span>
                  <InputNumber
                    min={1}
                    max={maxWeek}
                    size='large'
                    style={{ width: '100%' }}
                    value={endWeek}
                    onChange={setEndWeek}
                  />
                </label>
              </div>
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>上课地点</span>
              <Input
                size='large'
                placeholder='上课地点'
                value={classroom}
                onChange={(event) => setClassroom(event.target.value)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>教师（选填）</span>
              <Input
                size='large'
                placeholder='教师'
                value={teacher}
                onChange={(event) => setTeacher(event.target.value)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>学分（选填）</span>
              <InputNumber
                min={0}
                step={0.5}
                size='large'
                placeholder='学分'
                value={credit}
                onChange={setCredit}
                style={{ width: '100%' }}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>详细信息（选填）</span>
              <Input.TextArea
                rows={4}
                placeholder='课程详细信息'
                value={detailText}
                onChange={(event) => setDetailText(event.target.value)}
              />
            </div>
          </div>

          <Button
            className='add-courses-save-button'
            type='primary'
            size='large'
            loading={isSaving}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddCoursesPage
