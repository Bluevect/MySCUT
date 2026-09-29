import { message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import {
  getReloadManualEnabledStartup,
  getUseLocalManual,
  LOCAL_MANUAL_URL,
  REMOTE_MANUAL_URL,
  setUseLocalManual,
} from '../../core/manual/manualSourceStorage'
import { useLocation } from 'react-router-dom'
import { registerHardwareBackButtonHandler } from '../../platform/capacitor/useHardwareBackButton'
import { goBackInIframe } from '../../platform/web/iframeHistory'

const REMOTE_LOAD_TIMEOUT_MS = 10000

function ManualPage() {
  const location = useLocation()
  const isActive = location.pathname === '/manual'
  const [iframeEverActivated, setIframeEverActivated] = useState(isActive)
  const [messageApi, contextHolder] = message.useMessage()
  const [iframeSrc, setIframeSrc] = useState(() =>
    getUseLocalManual() ? LOCAL_MANUAL_URL : REMOTE_MANUAL_URL,
  )
  const remoteFallbackTimerRef = useRef<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (isActive) {
      setIframeEverActivated(true)
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) {
      return
    }

    // The iframe keeps its own history: back walks it first, then leaves the tab
    return registerHardwareBackButtonHandler(() => goBackInIframe(iframeRef.current))
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
        ref={iframeRef}
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
