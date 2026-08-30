export function AppBootstrapSkeleton() {
  return (
    <div className='app-bootstrap-shell' role='status' aria-live='polite' aria-busy='true'>
      <div className='app-bootstrap-brand'>
        <img className='app-bootstrap-icon' src='/icons/icon-192.png' alt='' aria-hidden='true' />
        <h1>MySCUT</h1>
        <p>正在准备你的校园工具</p>
        <span className='app-bootstrap-progress' aria-hidden='true' />
        <span className='app-bootstrap-status-text'>正在初始化本地数据…</span>
      </div>
    </div>
  )
}

export default AppBootstrapSkeleton
