import type { CSSProperties, ReactNode } from 'react'
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
  const activeIndex = items.findIndex((item) => location.pathname.startsWith(item.to))
  const style = {
    '--qm-tabbar-count': items.length,
    '--qm-tabbar-active-index': activeIndex,
  } as CSSProperties

  return (
    <nav className={className ? `qm-tabbar ${className}` : 'qm-tabbar'} style={style} aria-label={ariaLabel}>
      <div className='qm-tabbar__pane'>
        <span className='qm-tabbar__pill' aria-hidden='true' />
        {items.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={
              index === activeIndex ? 'qm-tabbar__link qm-tabbar__link--active' : 'qm-tabbar__link'
            }
            aria-current={index === activeIndex ? 'page' : undefined}
          >
            <span className='qm-tabbar__content'>
              <span className='qm-tabbar__icon'>{item.icon}</span>
              <span className='qm-tabbar__label'>{item.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default QmuiTabbar
