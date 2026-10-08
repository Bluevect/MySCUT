import { LeftOutlined } from '@ant-design/icons'
import { Button, Input, InputNumber, Modal, Select, message } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTE_PATHS } from '../../app/routePaths'
import { TransparentIconButton } from '../../components/buttons/TransparentIconButton'
import { loadSavedScheduleById, updateSavedScheduleData } from '../../core/schedule/storage'
import type { ScheduleLesson } from '../../core/schedule/types'

type EditCoursePageProps = {
  scheduleId: string
  courseId: number
  instanceId: string
}

const WEEKDAY_OPTIONS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

function isWeekday(value: number): value is ScheduleLesson['day'] {
  return Number.isInteger(value) && value >= 1 && value <= 7
}

function EditCoursePage({ scheduleId, courseId, instanceId }: EditCoursePageProps) {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const savedSchedule = useMemo(() => loadSavedScheduleById(scheduleId), [scheduleId])
  const scheduleData = savedSchedule?.scheduleData ?? null
  const course = scheduleData?.courses.find((item) => item.id === courseId) ?? null
  const lesson = scheduleData?.lessons.find(
    (item) => item.courseId === courseId && item.instanceId === instanceId,
  ) ?? null
  const maxNode = scheduleData?.table.nodes ?? 12
  const maxWeek = scheduleData?.table.maxWeek ?? 20

  const [courseName, setCourseName] = useState(course?.name ?? '')
  const [credit, setCredit] = useState<number | null>(course?.credit ?? 0)
  const [day, setDay] = useState<ScheduleLesson['day']>(lesson?.day ?? 1)
  const [startNode, setStartNode] = useState<number | null>(lesson?.startNode ?? 1)
  const [endNode, setEndNode] = useState<number | null>(lesson?.endNode ?? 2)
  const [startWeek, setStartWeek] = useState<number | null>(lesson?.startWeek ?? 1)
  const [endWeek, setEndWeek] = useState<number | null>(lesson?.endWeek ?? maxWeek)
  const [weekStep, setWeekStep] = useState<number | null>(lesson?.weekStep ?? 1)
  const [classroom, setClassroom] = useState(lesson?.room ?? '')
  const [teacher, setTeacher] = useState(lesson?.teacher ?? '')
  const [detailText, setDetailText] = useState(lesson?.detailText ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleReturn() {
    navigate(APP_ROUTE_PATHS.coursesAllCoursesPage)
  }

  async function handleSave() {
    if (!scheduleData || !course || !lesson) {
      messageApi.error('找不到要修改的课表或课程，请返回课程列表后重试')
      return
    }

    const normalizedName = courseName.trim()
    if (!normalizedName) {
      messageApi.error('请填写课程名称')
      return
    }

    if (credit === null || !Number.isFinite(credit) || credit < 0) {
      messageApi.error('学分必须是大于或等于 0 的数字')
      return
    }

    if (
      startNode === null ||
      endNode === null ||
      startWeek === null ||
      endWeek === null ||
      weekStep === null ||
      !Number.isInteger(startNode) ||
      !Number.isInteger(endNode) ||
      !Number.isInteger(startWeek) ||
      !Number.isInteger(endWeek) ||
      !Number.isInteger(weekStep) ||
      startNode < 1 ||
      endNode > maxNode ||
      startNode > endNode ||
      startWeek < 1 ||
      endWeek > maxWeek ||
      startWeek > endWeek ||
      weekStep < 1
    ) {
      messageApi.error('请检查节数、周数和周数间隔')
      return
    }

    const timeSlotByNode = new Map(
      scheduleData.timeSlots.map((timeSlot) => [timeSlot.node, timeSlot] as const),
    )
    const startTimeSlot = timeSlotByNode.get(startNode)
    const endTimeSlot = timeSlotByNode.get(endNode)

    const updatedLesson: ScheduleLesson = {
      ...lesson,
      day,
      startNode,
      endNode,
      startWeek,
      endWeek,
      weekStep,
      room: classroom.trim(),
      teacher: teacher.trim(),
      detailText: detailText.trim(),
      startTime: lesson.ownTime
        ? lesson.startTime
        : startTimeSlot?.startTime ?? (startNode === lesson.startNode ? lesson.startTime : ''),
      endTime: lesson.ownTime
        ? lesson.endTime
        : endTimeSlot?.endTime ?? (endNode === lesson.endNode ? lesson.endTime : ''),
    }
    
    const updatedScheduleData = {
      ...scheduleData,
      table: {
        ...scheduleData.table,
        showSat: scheduleData.table.showSat || day === 6,
        showSun: scheduleData.table.showSun || day === 7,
      },
      courses: scheduleData.courses.map((item) =>
        item.id === courseId ? { ...item, name: normalizedName, credit } : item,
      ),
      lessons: scheduleData.lessons.map((item) =>
        item.courseId === courseId && item.instanceId === instanceId
          ? updatedLesson
          : item,
      ),
    }

    try {
      setIsSaving(true)
      const saved = await updateSavedScheduleData(scheduleId, updatedScheduleData)
      if (!saved) {
        throw new Error('课表已不存在，请返回课程列表后重试')
      }

      navigate(APP_ROUTE_PATHS.coursesAllCoursesPage, {
        state: { message: `课程“${normalizedName}”修改已保存` },
      })
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '课程修改失败')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!scheduleData || !course || !lesson) {
      messageApi.error('找不到要删除的课表或课程，请返回课程列表后重试')
      setIsDeleteModalOpen(false)
      return
    }

    const updatedScheduleData = {
      ...scheduleData,
      courses: scheduleData.courses.filter((item) => item.id !== courseId),
      lessons: scheduleData.lessons.filter((item) => item.courseId !== courseId),
    }

    try {
      setIsDeleting(true)
      const saved = await updateSavedScheduleData(scheduleId, updatedScheduleData)
      if (!saved) {
        throw new Error('课表已不存在，请返回课程列表后重试')
      }

      navigate(APP_ROUTE_PATHS.coursesAllCoursesPage, {
        state: { message: `课程“${course.name}”已删除` },
      })
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '课程删除失败')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const hasCourseTarget = Boolean(scheduleData && course && lesson)

  return (
    <div className='add-courses-page edit-course-page'>
      {contextHolder}
      <header className='add-courses-header'>
        <div className='add-courses-left-panel'>
          <TransparentIconButton
            ariaLabel='返回'
            icon={<LeftOutlined />}
            onClick={handleReturn}
          />
        </div>
        <div className='add-courses-title'>修改课程</div>
      </header>

      <div className='add-courses-content'>
        {hasCourseTarget ? (
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
                <span className='add-courses-label'>学分</span>
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
                <span className='add-courses-label'>上课时间（星期）</span>
                <Select
                  size='large'
                  style={{ width: '100%' }}
                  options={WEEKDAY_OPTIONS}
                  value={day}
                  onChange={(value: number) => {
                    if (isWeekday(value)) {
                      setDay(value)
                    }
                  }}
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
                <span className='add-courses-label'>周数间隔</span>
                <InputNumber
                  min={1}
                  step={1}
                  precision={0}
                  size='large'
                  placeholder='每隔几周上课'
                  value={weekStep}
                  onChange={setWeekStep}
                  style={{ width: '100%' }}
                />
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
              loading={isSaving || isDeleting}
              disabled={isDeleting}
              onClick={handleSave}
            >
              保存
            </Button>
          </div>
        ) : (
          <div className='all-courses-empty'>
            找不到要修改的课表或课程
            <Button type='link' onClick={handleReturn}>返回课程列表</Button>
          </div>
        )}

        {hasCourseTarget && (
          <div className='add-courses-form-card edit-course-danger-card'>
            <div className='add-courses-field'>
              <span className='add-courses-label'>危险区域</span>
              <Button
                className='edit-course-delete-button'
                danger
                type='primary'
                size='large'
                disabled={isSaving || isDeleting}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                删除课程
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        title='删除课程确认'
        open={isDeleteModalOpen}
        confirmLoading={isDeleting}
        okText='确认删除'
        cancelText='取消'
        okButtonProps={{ danger: true }}
        onOk={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      >
        <p>
          确定删除“{course?.name ?? '该课程'}”吗？该课程的所有上课安排都会从此课表中删除，且无法撤销。
        </p>
      </Modal>
    </div>
  )
}

export default EditCoursePage
