import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { NotFoundPage, RouteLoadingView } from '../components/AppRouteStates'
import { getReloadManualEnabledStartup } from '../core/manual/manualSourceStorage'
import { APP_ROUTE_PATHS } from './routePaths'

const isWebPlatform = import.meta.env.VITE_TARGET_PLATFORM === 'web'

const CoursesPage = lazy(async () => {
  const module = await import('../features/courses/CoursesPage')
  return { default: module.default }
})

const AddCoursesPage = lazy(async () => {
  const module = await import('../features/courses/AddCoursesPage')
  return { default: module.default }
})

const ManualPage = lazy(async () => {
  const module = await import('../features/manual/ManualPage')
  return { default: module.default }
})

const MinePage = lazy(async () => {
  const module = await import('../features/mine/MinePage')
  return { default: module.default }
})

const ScheduleSettingsPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScheduleSettingsPage')
  return { default: module.default }
})

const ScheduleIntersectionPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScheduleIntersectionPage')
  return { default: module.default }
})

const AiSettingsPage = lazy(async () => {
  const module = await import('../features/mine/pages/AiSettingsPage')
  return { default: module.default }
})

const ScutPdfImportPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScutPdfImportPage')
  return { default: module.default }
})

const ScutJwImportPage = isWebPlatform
  ? null
  : lazy(async () => {
    const module = await import('../features/mine/pages/ScutJwImportPage')
    return { default: module.default }
  })

const ScutJwWebViewPage = isWebPlatform
  ? null
  : lazy(async () => {
    const module = await import('../features/mine/pages/ScutJwWebViewPage')
    return { default: module.default }
  })

const MineDetailPage = lazy(async () => {
  const module = await import('../features/mine/MineDetailPage')
  return { default: module.default }
})

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingView />}>
      <Routes>
        <Route path={APP_ROUTE_PATHS.root} element={<Navigate to={APP_ROUTE_PATHS.courses} replace />} />
        <Route path={APP_ROUTE_PATHS.courses} element={<CoursesPage />} />
        <Route path={APP_ROUTE_PATHS.coursesAddCoursesPage} element={<AddCoursesPage />} />
        <Route path={APP_ROUTE_PATHS.coursesIntersectionPreview} element={<CoursesPage />} />
        <Route path={APP_ROUTE_PATHS.manual} element={getReloadManualEnabledStartup() ? <ManualPage /> : null} />
        <Route path={APP_ROUTE_PATHS.mine} element={<MinePage />} />
        <Route path={APP_ROUTE_PATHS.mineScheduleSettings} element={<ScheduleSettingsPage />} />
        <Route path={APP_ROUTE_PATHS.mineScheduleIntersection} element={<ScheduleIntersectionPage />} />
        <Route path={APP_ROUTE_PATHS.mineAiSettings} element={<AiSettingsPage />} />
        <Route path={APP_ROUTE_PATHS.mineImportScutPdf} element={<ScutPdfImportPage />} />
        <Route
          path={APP_ROUTE_PATHS.mineImportScutJw}
          element={isWebPlatform || ScutJwImportPage === null ? <Navigate to={APP_ROUTE_PATHS.mineScheduleSettings} replace /> : <ScutJwImportPage />}
        />
        <Route
          path={APP_ROUTE_PATHS.mineImportScutJwWebView}
          element={isWebPlatform || ScutJwWebViewPage === null ? <Navigate to={APP_ROUTE_PATHS.mineScheduleSettings} replace /> : <ScutJwWebViewPage />}
        />
        <Route path={APP_ROUTE_PATHS.mineGlobalSettings} element={<MineDetailPage title='全局设置' />} />
        <Route path={APP_ROUTE_PATHS.mineFaq} element={<MineDetailPage title='常见问答' />} />
        <Route path={APP_ROUTE_PATHS.mineMore} element={<MineDetailPage title='更多' />} />
        <Route path={APP_ROUTE_PATHS.notFound} element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
