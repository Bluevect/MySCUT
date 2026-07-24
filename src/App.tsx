import { Link, useLocation } from 'react-router-dom'
import { Tabbar, TabbarLink, ToolbarPane } from 'konsta/react'
import AppRoutes from './app/routes'
import { useHardwareBackButton } from './platform/capacitor/useHardwareBackButton'
import { useAndroidViewportInset } from './platform/capacitor/useAndroidViewportInset'
import { StorageStatusBanner } from './platform/storage/StorageRuntimeProvider'

const TAB_ITEMS = [
  { to: '/courses', label: '课程' },
  { to: '/manual', label: '手册' },
  { to: '/mine', label: '我的' },
]

function App() {
  useHardwareBackButton()
  useAndroidViewportInset()

  const location = useLocation()
  const isMineDetailPage = location.pathname.startsWith('/mine/')
  const isCoursesPage = location.pathname === '/courses'
  const isManualPage = location.pathname === '/manual'

  return (
    <div className='app-shell'>
      <StorageStatusBanner />
      <main
        className={`page-content ${isMineDetailPage ? 'page-content--fullscreen' : ''} ${isCoursesPage ? 'page-content--courses' : ''} ${isManualPage ? 'page-content--manual' : ''}`}
      >
        <AppRoutes />
      </main>

      {!isMineDetailPage && (
        <Tabbar
          component='nav'
          labels
          className='app-tabbar fixed bottom-0 left-0'
          aria-label='底部导航'
        >
          <ToolbarPane>
            {TAB_ITEMS.map((tab) => (
              <TabbarLink
                key={tab.to}
                component={Link}
                linkProps={{ to: tab.to }}
                active={location.pathname.startsWith(tab.to)}
                label={tab.label}
              />
            ))}
          </ToolbarPane>
        </Tabbar>
      )}
    </div>
  )
}

export default App
