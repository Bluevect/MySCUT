import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App as KonstaApp } from 'konsta/react'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { GlobalThemeProvider } from './platform/web/theme/GlobalThemeProvider'
import { bootstrapApplicationStorage } from './platform/storage/bootstrapApplicationStorage'
import { StorageRuntimeProvider } from './platform/storage/StorageRuntimeProvider'

const Router = import.meta.env.VITE_TARGET_PLATFORM === 'ohos' ? HashRouter : BrowserRouter

// 存储初始化与首帧渲染并行，避免入口 await 阻塞渲染造成白屏；就绪前由骨架屏占位
const storageBootstrap = bootstrapApplicationStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalThemeProvider>
      <Router>
        <KonstaApp theme='ios' dark>
          <StorageRuntimeProvider bootstrapRuntime={storageBootstrap}>
            <App />
          </StorageRuntimeProvider>
        </KonstaApp>
      </Router>
    </GlobalThemeProvider>
  </React.StrictMode>,
)

if (__PWA_ENABLED__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
