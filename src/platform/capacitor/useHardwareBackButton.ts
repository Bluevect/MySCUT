import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestAnimatedBack } from '../../core/navigation/animatedBack'
import { isAppRootPath, resolveBackPath } from '../../core/navigation/appBack'
import { dismissTopBackOverlay } from '../../core/navigation/backDismiss'

type HardwareBackButtonHandler = () => boolean | Promise<boolean>

type HardwareBackButtonOptions = {
  onExitHint: () => void
}

const EXIT_HINT_WINDOW_MS = 3000

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

export function useHardwareBackButton({ onExitHint }: HardwareBackButtonOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathnameRef = useRef(location.pathname)
  const onExitHintRef = useRef(onExitHint)
  const lastExitHintAtRef = useRef(0)

  useEffect(() => {
    onExitHintRef.current = onExitHint
  })

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const listenerPromise = CapacitorApp.addListener('backButton', async () => {
      const pathname = pathnameRef.current

      // Order: dismiss overlays, let the page handle it, then walk the app hierarchy
      if (dismissTopBackOverlay()) {
        return
      }

      if (await requestRegisteredHandlers()) {
        return
      }

      if (requestAnimatedBack()) {
        return
      }

      if (isAppRootPath(pathname)) {
        const now = Date.now()
        if (now - lastExitHintAtRef.current < EXIT_HINT_WINDOW_MS) {
          await CapacitorApp.exitApp()
          return
        }

        // First back at the root explains how to leave, pressing back again exits
        lastExitHintAtRef.current = now
        onExitHintRef.current()
        return
      }

      navigate(resolveBackPath(pathname), { replace: true })
    })

    return () => {
      listenerPromise.then((listener) => listener.remove()).catch(() => undefined)
    }
  }, [navigate])
}
