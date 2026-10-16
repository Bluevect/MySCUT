import { useRef, type CSSProperties, type ReactNode, type TouchEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

export type QmuiTabbarItem = {
  to: string
  label: string
  icon: ReactNode
}

type QmuiTabbarProps = {
  items: QmuiTabbarItem[]
  ariaLabel?: string
  className?: string
}

function QmuiTabbar({ items, ariaLabel, className }: QmuiTabbarProps) {
  const location = useLocation()
  const touchStartRef = useRef<{ identifier: number; x: number; y: number } | null>(null)
  const activeIndex = items.findIndex((item) => location.pathname.startsWith(item.to))
  const style = {
    '--qm-tabbar-count': items.length,
    '--qm-tabbar-active-index': activeIndex,
  } as CSSProperties

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined
    touchStartRef.current = touch
      ? { identifier: touch.identifier, x: touch.clientX, y: touch.clientY }
      : null
  }

  const handleTouchMove = (event: TouchEvent<HTMLAnchorElement>) => {
    const start = touchStartRef.current
    const touch = event.touches.length === 1 ? event.touches[0] : undefined
    if (
      !start ||
      !touch ||
      touch.identifier !== start.identifier ||
      Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10
    ) {
      touchStartRef.current = null
    }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLAnchorElement>) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    const touch = event.changedTouches[0]
    if (
      !start ||
      !touch ||
      event.touches.length > 0 ||
      touch.identifier !== start.identifier ||
      Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10
    ) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    if (
      touch.clientX < bounds.left ||
      touch.clientX > bounds.right ||
      touch.clientY < bounds.top ||
      touch.clientY > bounds.bottom
    ) {
      return
    }

    // Android WebView can omit the click immediately after a timetable swipe.
    // Activate the link once, suppressing its later compatibility click.
    event.preventDefault()
    event.currentTarget.click()
  }

  return (
    <nav
      className={className ? `qm-tabbar ${className}` : 'qm-tabbar'}
      style={style}
      aria-label={ariaLabel}
    >
      <div className="qm-tabbar__pane">
        <span className="qm-tabbar__pill" aria-hidden="true" />
        {items.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={
              index === activeIndex ? 'qm-tabbar__link qm-tabbar__link--active' : 'qm-tabbar__link'
            }
            aria-current={index === activeIndex ? 'page' : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStartRef.current = null
            }}
          >
            <span className="qm-tabbar__content">
              <span className="qm-tabbar__icon">{item.icon}</span>
              <span className="qm-tabbar__label">{item.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default QmuiTabbar
