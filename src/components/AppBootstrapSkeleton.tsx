export function AppBootstrapSkeleton() {
  return (
    <div className='app-bootstrap-skeleton' aria-busy='true'>
      <div className='bootstrap-header' aria-hidden='true'>
        <div className='bootstrap-header-text'>
          <div className='bootstrap-bar bootstrap-bar--title' />
          <div className='bootstrap-bar bootstrap-bar--sub' />
        </div>
        <div className='bootstrap-header-actions'>
          <span className='bootstrap-icon-btn' />
          <span className='bootstrap-icon-btn' />
          <span className='bootstrap-icon-btn' />
        </div>
      </div>

      <div className='bootstrap-schedule' aria-hidden='true' />

      <nav className='bootstrap-tabbar' aria-hidden='true'>
        <span className='bootstrap-tab'>
          <span className='bootstrap-tab-icon' />
          <span className='bootstrap-bar bootstrap-bar--tab' />
        </span>
        <span className='bootstrap-tab'>
          <span className='bootstrap-tab-icon' />
          <span className='bootstrap-bar bootstrap-bar--tab' />
        </span>
        <span className='bootstrap-tab'>
          <span className='bootstrap-tab-icon' />
          <span className='bootstrap-bar bootstrap-bar--tab' />
        </span>
      </nav>
    </div>
  )
}

export default AppBootstrapSkeleton
