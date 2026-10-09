import { EditOutlined, LeftOutlined, SearchOutlined } from '@ant-design/icons'
import { Input, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TransparentIconButton } from '../../components/buttons/TransparentIconButton'
import type { ScheduleLesson } from '../../core/schedule/types'
import { loadActiveScheduleEntry } from '../../core/schedule/storage'
import { APP_ROUTE_PATHS } from '../../app/routePaths'
import { RoundedSquareIconButton } from '../../components/buttons/RoundedSquareIconButton'

const WEEKDAY_LABELS = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

const LESSON_FIELDS: { key: keyof ScheduleLesson; label: string }[] = [
  { key: 'weekStep', label: '周次间隔' },
  { key: 'room', label: '上课地点' },
  { key: 'teacher', label: '教师' },
  { key: 'detailText', label: '详细信息' },
]

function formatLessonValue(lesson: ScheduleLesson, key: keyof ScheduleLesson) {
  const value = lesson[key]

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (value === undefined || value === null || value === '') {
    return '未填写'
  }

  return String(value)
}

function AllCoursesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [messageApi, contextHolder] = message.useMessage()
  const [searchText, setSearchText] = useState('')
  const activeSchedule = useMemo(() => loadActiveScheduleEntry(), [])
  const scheduleId = activeSchedule?.id
  const scheduleData = activeSchedule?.scheduleData ?? null
  const lessons = scheduleData?.lessons ?? []
  const coursesById = useMemo(
    () => new Map(scheduleData?.courses.map((course) => [course.id, course]) ?? []),
    [scheduleData],
  )
  const normalizedSearchText = searchText.trim().toLocaleLowerCase()
  const filteredLessons = normalizedSearchText
    ? lessons.filter((lesson) => {
        const searchableText = [
          coursesById.get(lesson.courseId)?.name,
          coursesById.get(lesson.courseId)?.credit,
          WEEKDAY_LABELS[lesson.day],
          lesson.startNode,
          lesson.endNode,
          lesson.startWeek,
          lesson.endWeek,
          lesson.weekStep,
          lesson.room,
          lesson.teacher,
          lesson.detailText,
        ]
          .join(' ')
          .toLocaleLowerCase()

        return searchableText.includes(normalizedSearchText)
      })
    : lessons

  useEffect(() => {
    const popupMessage = location.state?.message
    if (typeof popupMessage !== 'string' || popupMessage.length === 0) {
      return
    }

    messageApi.success(popupMessage).then(() => {
      window.history.replaceState({ ...window.history.state, usr: null }, '', location.pathname)
    })
  }, [location.pathname, location.state, messageApi, navigate])

  return (
    <div className="all-courses-page">
      {contextHolder}
      <header className="all-courses-header">
        <div className="all-courses-back">
          <TransparentIconButton
            ariaLabel="返回"
            icon={<LeftOutlined />}
            onClick={() => navigate(APP_ROUTE_PATHS.courses)}
          />
        </div>
        <div className="all-courses-title">查看所有课程</div>
      </header>

      <div className="all-courses-content">
        {lessons.length === 0 ? (
          <div className="all-courses-empty">
            {scheduleData ? '当前课表没有课程' : '请先选择或导入课表'}
          </div>
        ) : (
          <>
            <Input
              className="all-courses-search"
              size="large"
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索课程名称、星期、地点或教师"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            {filteredLessons.length === 0 ? (
              <div className="all-courses-empty">没有找到匹配的课程</div>
            ) : (
              <div className="all-courses-list">
                {filteredLessons.map((lesson, index) => (
                  <article className="all-courses-card" key={`${lesson.instanceId}-${index}`}>
                    <div className="all-courses-card-title-row">
                      <h2 className="all-courses-card-title">
                        {`${index + 1} ${coursesById.get(lesson.courseId)?.name ?? '未命名课程'}`}
                      </h2>
                      {scheduleId && (
                        <RoundedSquareIconButton
                          ariaLabel={`修改${coursesById.get(lesson.courseId)?.name ?? '课程'}`}
                          className="all-courses-edit-button"
                          onClick={() =>
                            navigate(
                              APP_ROUTE_PATHS.coursesEditCoursePage
                                .replace(':scheduleId', encodeURIComponent(scheduleId))
                                .replace(':courseId', String(lesson.courseId))
                                .replace(':instanceId', encodeURIComponent(lesson.instanceId)),
                            )
                          }
                          icon={<EditOutlined />}
                        />
                      )}
                    </div>

                    <dl className="all-courses-fields">
                      <div className="all-courses-field">
                        <dt>课程时间</dt>
                        <dd>
                          {WEEKDAY_LABELS[lesson.day]} {lesson.startNode}-{lesson.endNode} 节
                        </dd>
                      </div>

                      <div className="all-courses-field">
                        <dt>周数</dt>
                        <dd>
                          {lesson.startWeek}-{lesson.endWeek}
                        </dd>
                      </div>

                      <div className="all-courses-field">
                        <dt>学分</dt>
                        <dd>
                          {(coursesById.get(lesson.courseId)?.credit ?? 0) > 0
                            ? coursesById.get(lesson.courseId)?.credit
                            : '未填写'}
                        </dd>
                      </div>

                      {LESSON_FIELDS.map(({ key, label }) => (
                        <div className="all-courses-field" key={key}>
                          <dt>{label}</dt>
                          <dd>{formatLessonValue(lesson, key)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AllCoursesPage
