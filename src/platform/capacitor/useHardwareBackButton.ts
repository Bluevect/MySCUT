import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestAnimatedBack } from '../../core/navigation/animatedBack'

type HardwareBackButtonHandler = () => boolean | Promise<boolean>

let registeredHandler: HardwareBackButtonHandler | null = null

export function registerHardwareBackButtonHandler(handler: HardwareBackButtonHandler) {
  registeredHandler = handler

  return () => {
    if (registeredHandler === handler) {
      registeredHandler = null
    }
  }
}

export function useHardwareBackButton() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const listenerPromise = CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      if (registeredHandler) {
        try {
          if (await registeredHandler()) {
            return
          }
        } catch {}
      }

      if (canGoBack) {
        const handled = requestAnimatedBack()
        if (!handled) {
          navigate(-1)
        }

        return
      }

      CapacitorApp.exitApp()
    })

    return () => {
      listenerPromise
        .then((listener) => listener.remove())
        .catch(() => undefined)
    }
  }, [navigate])
}
