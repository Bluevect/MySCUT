import { useLocation, useNavigate } from 'react-router-dom'
import { BookOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons'
import { message } from 'antd'
import AppRoutes from './app/routes'
import { useHardwareBackButton } from './platform/capacitor/useHardwareBackButton'
import { useAndroidViewportInset } from './platform/capacitor/useAndroidViewportInset'
import { StorageStatusBanner } from './platform/storage/StorageRuntimeProvider'
import { RouteContentErrorBoundary } from './components/AppRouteStates'
import { ManualPage } from './features/manual'
import { getReloadManualEnabledStartup } from './core/manual/manualSourceStorage'
import { shouldShowBottomNavigation } from './app/bottomNavigation'
import { QmuiTabbar, type QmuiTabbarItem } from './qmui'

const TAB_ITEMS: QmuiTabbarItem[] = [
  { to: '/courses', label: '课程', icon: <CalendarOutlined /> },
  { to: '/manual', label: '手册', icon: <BookOutlined /> },
  { to: '/mine', label: '我的', icon: <UserOutlined /> },
]

function App() {
  const [messageApi, contextHolder] = message.useMessage()

  useHardwareBackButton({ onExitHint: () => messageApi.info('再按一次返回键退出应用') })
  useAndroidViewportInset()

  const location = useLocation()
  const navigate = useNavigate()
  const isMineDetailPage = location.pathname.startsWith('/mine/')
  const isCoursesPage = location.pathname === '/courses'
  const isAddCoursesPage = location.pathname === '/courses/add-courses'
  const isAllCoursesPage = location.pathname === '/courses/all-courses'
  const isEditCoursesPage = location.pathname.startsWith('/courses/edit-course/')
  const isManualPage = location.pathname === '/manual'
  const routeBoundaryKey = `${location.key}:${location.pathname}`

  return (
    <div className='app-shell'>
      {contextHolder}
      <StorageStatusBanner />
      <main
        className={`
          page-content 
          ${isMineDetailPage ? 'page-content--fullscreen' : ''}
          ${isCoursesPage ? 'page-content--courses' : ''}
          ${isAddCoursesPage ? 'page-content--courses' : ''}
          ${isAllCoursesPage ? 'page-content--courses' : ''}
          ${isEditCoursesPage ? 'page-content--courses' : ''}
          ${isManualPage ? 'page-content--manual' : ''}
        `}
      >
        <RouteContentErrorBoundary
          key={routeBoundaryKey}
          onRetry={() => window.location.reload()}
          onReturnToCourses={() => navigate('/courses')}
        >
          <AppRoutes />
        </RouteContentErrorBoundary>

        {!getReloadManualEnabledStartup() && (
          <ManualPage />
        )}
        
      </main>

      {shouldShowBottomNavigation(location.pathname) && (
        <QmuiTabbar items={TAB_ITEMS} ariaLabel='底部导航' />
      )}
    </div>
  )
}

export default App
