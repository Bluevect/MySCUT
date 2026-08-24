import { useEffect, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import {
  clearOpenAiCompatibleSettings,
  getOpenAiCompatibleSettings,
  getPreferredAiProvider,
  OPENAI_API_KEY_LOCAL_ONLY_NOTICE,
  setOpenAiCompatibleSettings,
  setStoredAiProvider,
  type AiProviderId,
} from '../../../core/ai'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

// localModel 未实现，暂不提供选择；仅保留可用的 OpenAI 兼容直连方式
const AI_PROVIDER_GUID = {
  title: 'OpenAI 兼容调用说明',
  overview: '请求将直接发送到你自己配置的 OpenAI 兼容服务商，适合自带 Key 与私有部署场景。',
  needConfig: true,
  steps: [
    '填写 Base URL（示例：https://api.openai.com/v1）。',
    '填写 API Key（格式通常为 Bearer Token 对应密钥）。',
    '点击“保存设置”后即可生效。',
    '若返回 401/403，请确认 Key 权限；若 404，请确认 Base URL 不要拼到 /chat/completions。',
  ],
}

function AiSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [providerId, setProviderId] = useState<AiProviderId>(() => getPreferredAiProvider())
  const [baseUrl, setBaseUrl] = useState(() => getOpenAiCompatibleSettings()?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(() => getOpenAiCompatibleSettings()?.apiKey ?? '')
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const closeTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)
  const providerGuide = AI_PROVIDER_GUID

  const navigateBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine', { replace: true })
  }

  const startClosingTransition = () => {
    if (isClosingRef.current) {
      return false
    }

    isClosingRef.current = true
    setTransitionStage('closing')

    closeTimerRef.current = window.setTimeout(() => {
      navigateBack()
    }, CLOSE_TRANSITION_MS)

    return true
  }

  useEffect(() => {
    enterTimerRef.current = window.setTimeout(() => {
      setTransitionStage('entered')
    }, ENTER_ANIMATION_FRAME_MS)

    const handleAnimatedBack = (event: Event) => {
      const customEvent = event as CustomEvent<AnimatedBackRequestDetail>

      if (customEvent.detail.handled) {
        return
      }

      const handled = startClosingTransition()
      customEvent.detail.handled = handled
    }

    window.addEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)

    return () => {
      window.removeEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)

      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
      }

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const handleSaveSettings = () => {
    if (providerId === 'openaiCompatible') {
      if (!baseUrl.trim()) {
        messageApi.error('请填写 Base URL')
        return
      }

      if (!apiKey.trim()) {
        messageApi.error('请填写 API Key')
        return
      }

      const saved = setOpenAiCompatibleSettings({
        baseUrl,
        apiKey,
      })

      if (!saved) {
        messageApi.error('OpenAI 兼容配置保存失败，请稍后重试')
        return
      }
    }

    const savedProvider = setStoredAiProvider(providerId)
    if (!savedProvider) {
      messageApi.error('调用方式保存失败，请稍后重试')
      return
    }

    messageApi.success('AI 设置已保存')
  }

  const handleResetDefault = () => {
    const providerSaved = setStoredAiProvider('openaiCompatible')
    const configCleared = clearOpenAiCompatibleSettings()

    if (!providerSaved || !configCleared) {
      messageApi.error('恢复默认失败，请稍后重试')
      return
    }

    setProviderId('openaiCompatible')
    setBaseUrl('')
    setApiKey('')
    messageApi.success('已恢复默认，请重新填写 OpenAI 兼容配置')
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>AI设置</p>
          <p className='schedule-settings-subtitle'>AI Settings</p>
        </div>

        <CircleIconButton
          ariaLabel='关闭 AI 设置页面'
          icon={<CloseOutlined />}
          disabled={transitionStage === 'closing'}
          onClick={startClosingTransition}
        />
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <div className='mine-group-button mine-detail-card-item ai-provider-guide-card'>
            <p className='mine-detail-card-title'>{providerGuide.title}</p>
            <p className='mine-detail-card-description'>{providerGuide.overview}</p>
            <p className='mine-detail-card-description'>配置要求：{providerGuide.needConfig ? '需要配置' : '无需额外配置'}</p>
            <ol className='ai-provider-guide-list'>
              {providerGuide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        {providerId === 'openaiCompatible' ? (
          <div className='mine-button-group'>
            <div className='mine-group-button ai-settings-form-panel'>
              <p className='mine-detail-card-title'>OpenAI 兼容配置</p>

              <div className='ai-settings-field'>
                <span className='ai-settings-label'>Base URL</span>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder='例如 https://api.openai.com/v1'
                />
              </div>

              <div className='ai-settings-field'>
                <span className='ai-settings-label'>API Key</span>
                <Input.Password
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder='请输入 API Key'
                />
              </div>

              <p className='ai-settings-notice'>{OPENAI_API_KEY_LOCAL_ONLY_NOTICE}</p>
            </div>
          </div>
        ) : null}

        <div className='mine-button-group ai-settings-action-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleSaveSettings}>
            保存设置
          </button>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleResetDefault}>
            恢复默认
          </button>
        </div>
      </div>
    </section>
  )
}

export default AiSettingsPage
