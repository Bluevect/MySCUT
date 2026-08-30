import {
  CalendarOutlined,
  HomeOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function RouteLoadingView() {
  return (
    <section className='app-route-state app-route-state--loading' role='status' aria-live='polite' aria-busy='true'>
      <div className='app-route-state-content'>
        <img className='app-route-state-app-icon' src='/icons/icon-192.png' alt='' aria-hidden='true' />
        <h1>正在打开页面</h1>
        <p>马上就好，请稍候。</p>
        <span className='app-route-loading-indicator' aria-hidden='true' />
      </div>
    </section>
  )
}

type RouteRecoveryViewProps = {
  onRetry: () => void
  onReturnToCourses: () => void
}

export function RouteRecoveryView({ onRetry, onReturnToCourses }: RouteRecoveryViewProps) {
  return (
    <section className='app-route-state' role='alert' aria-labelledby='route-recovery-title'>
      <div className='app-route-state-content app-route-state-card'>
        <span className='app-route-state-symbol app-route-state-symbol--warning' aria-hidden='true'>
          <WarningOutlined />
        </span>
        <h1 id='route-recovery-title'>当前页面暂时无法显示</h1>
        <p>页面加载时遇到了问题。你可以重试，或先返回课程页。</p>
        <div className='app-route-state-actions'>
          <button type='button' className='app-state-primary-button' onClick={onRetry}>
            <ReloadOutlined aria-hidden='true' />
            <span>重试当前页面</span>
          </button>
          <button type='button' className='app-state-secondary-button' onClick={onReturnToCourses}>
            <HomeOutlined aria-hidden='true' />
            <span>返回课程页</span>
          </button>
        </div>
      </div>
    </section>
  )
}

type RouteContentErrorBoundaryProps = RouteRecoveryViewProps & {
  children: ReactNode
}

type RouteContentErrorBoundaryState = {
  error: Error | null
}

export class RouteContentErrorBoundary extends Component<
  RouteContentErrorBoundaryProps,
  RouteContentErrorBoundaryState
> {
  state: RouteContentErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: unknown): RouteContentErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error('页面渲染失败'),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('页面内容渲染失败', error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.props.onRetry()
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <RouteRecoveryView
          onRetry={this.handleRetry}
          onReturnToCourses={this.props.onReturnToCourses}
        />
      )
    }

    return this.props.children
  }
}

export function NotFoundPage() {
  return (
    <section className='app-route-state' aria-labelledby='not-found-title'>
      <div className='app-route-state-content app-route-state-card'>
        <span className='app-route-state-symbol' aria-hidden='true'>
          <CalendarOutlined />
        </span>
        <p className='app-route-state-code'>404</p>
        <h1 id='not-found-title'>页面不存在</h1>
        <p>这个地址没有对应的页面，可能已经移动或输入有误。</p>
        <Link className='app-state-primary-button' to='/courses'>
          <HomeOutlined aria-hidden='true' />
          <span>返回课程页</span>
        </Link>
      </div>
    </section>
  )
}
