import { message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import {
  getReloadManualEnabledStartup,
  getUseLocalManual,
  LOCAL_MANUAL_URL,
  REMOTE_MANUAL_URL,
  setUseLocalManual,
} from '../../core/manual/manualSourceStorage'
import { useLocation, useNavigationType } from 'react-router-dom'
import { registerHardwareBackButtonHandler } from '../../platform/capacitor/useHardwareBackButton'
import { createIframeHistory, type IframeHistory } from '../../platform/web/iframeHistory'

const REMOTE_LOAD_TIMEOUT_MS = 10000

function ManualPage() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const isActive = location.pathname === '/manual'
  const [iframeEverActivated, setIframeEverActivated] = useState(isActive)
  const [messageApi, contextHolder] = message.useMessage()
  const [iframeSrc, setIframeSrc] = useState(() =>
    getUseLocalManual() ? LOCAL_MANUAL_URL : REMOTE_MANUAL_URL,
  )
  const remoteFallbackTimerRef = useRef<number | null>(null)
  const iframeHistoryRef = useRef<IframeHistory | null>(null)
  const expectFrameDocumentRef = useRef(true)

  if (iframeHistoryRef.current === null) {
    iframeHistoryRef.current = createIframeHistory()
  }

  useEffect(() => {
    if (isActive) {
      setIframeEverActivated(true)
    }
  }, [isActive])

  useEffect(() => {
    // App pushes are skipped during back so iframe depth survives tab changes
    if (navigationType === 'PUSH') {
      iframeHistoryRef.current?.noteAppPush()
    }
  }, [location.key, navigationType])

  useEffect(() => {
    expectFrameDocumentRef.current = true
  }, [iframeSrc])

  useEffect(() => {
    if (!isActive) {
      return
    }

    // Back walks the manual first and only then leaves the tab
    return registerHardwareBackButtonHandler(() => iframeHistoryRef.current?.goBack() ?? false)
  }, [isActive])

  const clearRemoteTimer = () => {
    if (remoteFallbackTimerRef.current === null) {
      return
    }

    window.clearTimeout(remoteFallbackTimerRef.current)
    remoteFallbackTimerRef.current = null
  }

  const fallbackToLocalManual = () => {
    if (iframeSrc !== REMOTE_MANUAL_URL) {
      return
    }

    clearRemoteTimer()
    setUseLocalManual(true)
    setIframeSrc(LOCAL_MANUAL_URL)
    messageApi.warning('网络异常，加载本地手册')
  }

  useEffect(() => {
    clearRemoteTimer()

    if (iframeSrc !== REMOTE_MANUAL_URL) {
      return
    }

    remoteFallbackTimerRef.current = window.setTimeout(() => {
      fallbackToLocalManual()
    }, REMOTE_LOAD_TIMEOUT_MS)

    return () => {
      clearRemoteTimer()
    }
  }, [iframeSrc])

  const handleIframeLoad = () => {
    if (expectFrameDocumentRef.current) {
      expectFrameDocumentRef.current = false
      // A fresh frame document starts a new iframe history
      iframeHistoryRef.current?.reset()
    }

    if (iframeSrc === REMOTE_MANUAL_URL) {
      clearRemoteTimer()
    }
  }

  const handleIframeError = () => {
    fallbackToLocalManual()
  }

  if (!getReloadManualEnabledStartup() && !iframeEverActivated) {
    return null
  }

  return (
    <section
      className='manual-page'
      style={{ display: isActive || getReloadManualEnabledStartup() ? 'unset' : 'none' }}
    >
      {contextHolder}
      <iframe
        className='manual-iframe'
        src={iframeSrc}
        title='华工生存手册'
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </section>
  )
}

export default ManualPage
