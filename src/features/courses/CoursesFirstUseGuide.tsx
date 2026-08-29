import {
  CalendarOutlined,
  DownloadOutlined,
  MobileOutlined,
  RightOutlined,
} from '@ant-design/icons'

type CoursesFirstUseGuideProps = {
  onImport: () => void
}

const CAPABILITIES = [
  {
    icon: <DownloadOutlined />,
    title: '支持多种课表来源',
    description: '从教务系统、WakeUp、QMS 等已有来源导入，不必重新录入。',
  },
  {
    icon: <MobileOutlined />,
    title: '数据默认留在当前设备',
    description: '课表在本机保存，由你决定何时导出或迁移。',
  },
  {
    icon: <CalendarOutlined />,
    title: '清晰查看每周课程',
    description: '按周浏览课程、教室和教师信息，快速找到当下安排。',
  },
]

export function shouldShowCoursesFirstUseGuide(savedScheduleCount: number, isIntersectionPreviewMode: boolean) {
  return savedScheduleCount === 0 && !isIntersectionPreviewMode
}

function CoursesFirstUseGuide({ onImport }: CoursesFirstUseGuideProps) {
  return (
    <section className='courses-first-use-guide' aria-labelledby='courses-first-use-title'>
      <div className='courses-first-use-hero'>
        <img className='courses-first-use-app-icon' src='/icons/icon-192.png' alt='' aria-hidden='true' />
        <div>
          <p className='courses-first-use-eyebrow'>欢迎使用 MySCUT</p>
          <h1 id='courses-first-use-title' className='courses-first-use-title'>
            先导入一份课表
          </h1>
          <p className='courses-first-use-description'>一次导入，随后每周都能更轻松地查看课程安排。</p>
        </div>
      </div>

      <ul className='courses-first-use-capabilities' aria-label='课表能力介绍'>
        {CAPABILITIES.map((capability) => (
          <li key={capability.title} className='courses-first-use-capability'>
            <span className='courses-first-use-capability-icon' aria-hidden='true'>
              {capability.icon}
            </span>
            <div>
              <h2>{capability.title}</h2>
              <p>{capability.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <button type='button' className='courses-first-use-import-button' onClick={onImport}>
        <span>导入课表</span>
        <RightOutlined aria-hidden='true' />
      </button>
    </section>
  )
}

export default CoursesFirstUseGuide
