const FRAME_BACK_TIMEOUT_MS = 600

type FrameNavigation = {
  canGoBack: boolean
  currentEntry?: { key: string } | null
  back: () => Promise<unknown>
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

// The app and the iframe share one session history, so history.length and history.back() leak into the app
// The Navigation API is per window, so it is the only reliable way to walk the iframe's own entries
function readFrameNavigation(frame: HTMLIFrameElement | null) {
  try {
    const frameWindow = frame?.contentWindow as unknown as { navigation?: FrameNavigation } | null
    return frameWindow?.navigation ?? null
  } catch {
    // Cross-origin frames throw when their window is inspected
    return null
  }
}

export async function goBackInIframe(frame: HTMLIFrameElement | null) {
  const navigation = readFrameNavigation(frame)
  if (!navigation?.canGoBack) {
    return false
  }

  const beforeKey = navigation.currentEntry?.key ?? null
  try {
    await Promise.race([navigation.back(), wait(FRAME_BACK_TIMEOUT_MS)])
  } catch {
    // An aborted traversal can still move the frame, so let the entry key below decide
  }

  const afterKey = navigation.currentEntry?.key ?? null
  return afterKey !== null && afterKey !== beforeKey
}
