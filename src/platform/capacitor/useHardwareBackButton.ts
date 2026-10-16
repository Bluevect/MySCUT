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
  const locationRef = useRef(location)
  const pendingBackRef = useRef<typeof location | null>(null)
  const onExitHintRef = useRef(onExitHint)
  const lastExitHintAtRef = useRef<number | null>(null)

  useEffect(() => {
    onExitHintRef.current = onExitHint
  })

  useEffect(() => {
    locationRef.current = location
    lastExitHintAtRef.current = null
  }, [location])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    let disposed = false
    const listenerPromise = CapacitorApp.addListener('backButton', async () => {
      const pressedLocation = locationRef.current
      if (disposed || pendingBackRef.current === pressedLocation) {
        return
      }
      pendingBackRef.current = pressedLocation

      try {
        // Only consecutive, unhandled root presses confirm an exit.
        if (dismissTopBackOverlay()) {
          lastExitHintAtRef.current = null
          return
        }

        const handledByPage = await requestRegisteredHandlers()
        // An old page must not navigate or close the newly selected page.
        if (disposed || locationRef.current !== pressedLocation) {
          return
        }

        if (handledByPage || requestAnimatedBack()) {
          lastExitHintAtRef.current = null
          return
        }

        if (isAppRootPath(pressedLocation.pathname)) {
          const now = Date.now()
          const lastExitHintAt = lastExitHintAtRef.current
          if (lastExitHintAt !== null && now - lastExitHintAt < EXIT_HINT_WINDOW_MS) {
            await CapacitorApp.exitApp()
            return
          }

          lastExitHintAtRef.current = now
          onExitHintRef.current()
          return
        }

        navigate(resolveBackPath(pressedLocation.pathname), { replace: true })
      } finally {
        if (pendingBackRef.current === pressedLocation) {
          pendingBackRef.current = null
        }
      }
    })

    return () => {
      disposed = true
      listenerPromise.then((listener) => listener.remove()).catch(() => undefined)
    }
  }, [navigate])
}
