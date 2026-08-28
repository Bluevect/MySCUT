import { CloseOutlined } from '@ant-design/icons'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { Input, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import {
  SCUT_JW_CAMPUS_URL,
  SCUT_JW_WEBVPN_URL,
  resolveScutJwEntryUrl,
  type ScutJwAccessMode,
} from '../../../core/schedule/scutJwAccess'

const SCUT_JW_ACCESS_OPTIONS: Array<{
  value: ScutJwAccessMode
  label: string
  description: string
}> = [
  {
    value: 'campus',
    label: '校园网',
    description: SCUT_JW_CAMPUS_URL,
  },
  {
    value: 'webvpn',
    label: '校外 WebVPN',
    description: SCUT_JW_WEBVPN_URL,
  },
  {
    value: 'custom',
    label: '自定义网址',
    description: '输入其他可访问的教务系统网址',
  },
]

// Override via localStorage for testing against mock server:
//   localStorage.setItem('scutJwMockUrl', 'http://10.0.2.2:8080/')
function getScutJwTargetUrl(targetUrl: string): string {
  if (!import.meta.env.DEV) {
    return targetUrl
  }

  try {
    const override = localStorage.getItem('scutJwMockUrl')
    if (override) {
      debugLog('[ScutJwImport] Using mock URL:', override)
      return override
    }
  } catch {
    // localStorage may not be available
  }
  return targetUrl
}

/** Debug logger — stripped from production bundles via import.meta.env.DEV */
function debugLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log('[ScutJwImport]', ...args)
  }
}

function ScutJwImportPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [accessMode, setAccessMode] = useState<ScutJwAccessMode>('campus')
  const [customUrl, setCustomUrl] = useState('')
  const hasShownGuideRef = useRef(false)

  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const entryUrlResult = resolveScutJwEntryUrl(accessMode, customUrl)
  const customUrlError = accessMode === 'custom' && customUrl.trim() && !entryUrlResult.ok
    ? entryUrlResult.error
    : ''

  useEffect(() => {
    if (!isAndroidNative || hasShownGuideRef.current) {
      return
    }

    hasShownGuideRef.current = true
    Modal.info({
      title: '导入提示',
      content: '请选择当前可用的访问方式，登录教务系统并打开“个人课表查询”栏目，然后点击网页右下角的“导入当前页面”。',
      okText: '知道了',
    })
  }, [isAndroidNative])

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
  }

  const handleAccessModeChange = (nextAccessMode: ScutJwAccessMode) => {
    setAccessMode(nextAccessMode)
  }

  const handleCustomUrlChange = (nextCustomUrl: string) => {
    setCustomUrl(nextCustomUrl)
  }

  const handleOpenBrowser = () => {
    if (!entryUrlResult.ok) {
      messageApi.error(entryUrlResult.error)
      return
    }

    navigate('/mine/import-scut-jw-webview', {
      replace: true,
      state: { url: getScutJwTargetUrl(entryUrlResult.url) },
    })
  }

  return (
    <section className='schedule-settings-page'>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>从华工教务系统导入</p>
          <p className='schedule-settings-subtitle'>SCUT In-App Import</p>
        </div>

        <CircleIconButton ariaLabel='关闭页面' icon={<CloseOutlined />} onClick={handleClose} />
      </header>

      <div className='schedule-settings-content'>
        {!isAndroidNative ? (
          <p className='schedule-pdf-error'>当前环境不支持该功能，请在安卓原生应用中使用。</p>
        ) : (
          <>
            <fieldset className='scut-jw-access-group'>
              <legend className='scut-jw-access-legend'>访问方式</legend>
              <div className='scut-jw-access-options'>
                {SCUT_JW_ACCESS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`scut-jw-access-option ${accessMode === option.value ? 'is-active' : ''}`}
                  >
                    <input
                      type='radio'
                      name='scut-jw-access-mode'
                      value={option.value}
                      checked={accessMode === option.value}
                      onChange={() => handleAccessModeChange(option.value)}
                    />
                    <span className='scut-jw-access-radio' aria-hidden='true' />
                    <span className='scut-jw-access-copy'>
                      <span className='scut-jw-access-label'>
                        {option.label}
                        {option.value === 'campus' ? <span className='scut-jw-access-badge'>默认</span> : null}
                      </span>
                      <span className='scut-jw-access-description'>{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              {accessMode === 'custom' ? (
                <div className='scut-jw-custom-url'>
                  <Input
                    value={customUrl}
                    onChange={(event) => handleCustomUrlChange(event.target.value)}
                    placeholder='例如 jw.example.edu.cn'
                    inputMode='url'
                    autoCapitalize='none'
                    autoCorrect='off'
                    spellCheck={false}
                    status={customUrlError ? 'error' : undefined}
                    aria-invalid={Boolean(customUrlError)}
                    aria-describedby='scut-jw-custom-url-hint'
                  />
                  <p
                    id='scut-jw-custom-url-hint'
                    className={`scut-jw-custom-url-hint ${customUrlError ? 'is-error' : ''}`}
                    role={customUrlError ? 'alert' : undefined}
                  >
                    {customUrlError || '未填写协议时将自动使用 HTTPS'}
                  </p>
                </div>
              ) : null}
            </fieldset>

            <div className='scut-jw-tip-card'>
              <p className='scut-jw-tip-title'>操作提示</p>
              <p className='scut-jw-tip-text'>1. 选择访问方式，点击“打开教务系统”并完成登录</p>
              <p className='scut-jw-tip-text'>2. 在内置浏览器中进入“个人课表查询”栏目</p>
              <p className='scut-jw-tip-text'>3. 出现课表后，点击“导入当前页面”按钮</p>
            </div>

            <div className='mine-button-group'>
              <button type='button' className='mine-group-button schedule-settings-action' onClick={handleOpenBrowser} disabled={!entryUrlResult.ok}>
                打开教务系统
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ScutJwImportPage
