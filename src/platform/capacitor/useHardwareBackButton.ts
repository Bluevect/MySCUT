import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestAnimatedBack } from '../../core/navigation/animatedBack'
import { isAppRootPath, resolveBackPath } from '../../core/navigation/appBack'
import { dismissTopBackOverlay } from '../../core/navigation/backDismiss'

type HardwareBackButtonHandler = () => boolean | Promise<boolean>

const handlers: HardwareBackButtonHandler[] = []

export function registerHardwareBackButtonHandler(handler: HardwareBackButtonHandler) {
  handlers.push(handler)

  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index >= 0) {
      handlers.splice(index, 1)
    }
  }
}

async function requestRegisteredHandlers() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    try {
      if (await handlers[index]()) {
        return true
      }
    } catch {
      // Fall through to the app hierarchy when a page handler fails, so back never gets stuck
    }
  }

  return false
}

export function useHardwareBackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathnameRef = useRef(location.pathname)

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const listenerPromise = CapacitorApp.addListener('backButton', async () => {
      // Fixed order: dismiss overlays, let the page handle it, then walk the app hierarchy (never browser history)
      if (dismissTopBackOverlay()) {
        return
      }

      if (await requestRegisteredHandlers()) {
        return
      }

      if (requestAnimatedBack()) {
        return
      }

      const pathname = pathnameRef.current
      if (isAppRootPath(pathname)) {
        await CapacitorApp.exitApp()
        return
      }

      navigate(resolveBackPath(pathname), { replace: true })
    })

    return () => {
      listenerPromise
        .then((listener) => listener.remove())
        .catch(() => undefined)
    }
  }, [navigate])
}
