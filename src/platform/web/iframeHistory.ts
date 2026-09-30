export type IframeHistory = {
  reset: () => void
  noteAppPush: () => void
  goBack: () => boolean
}

// The app and the iframe share one session history, so every iframe navigation still adds an entry the app
// can count; cross-origin frames hide their own history, which leaves that count as the only way to walk it
export function createIframeHistory(): IframeHistory {
  let baseline = window.history.length
  let appPushCount = 0
  let appPushesAfterFrameEntry = 0
  let knownFrameDepth = 0

  return {
    // Entries from before this point are out of reach once the app or the frame document moves on
    reset() {
      baseline = window.history.length
      appPushCount = 0
      appPushesAfterFrameEntry = 0
      knownFrameDepth = 0
    },
    // Tab changes add app entries, so keep them separate from the frame depth
    noteAppPush() {
      const frameDepthBeforePush = Math.max(0, window.history.length - baseline - appPushCount - 1)
      if (frameDepthBeforePush > knownFrameDepth) {
        appPushesAfterFrameEntry = 0
        knownFrameDepth = frameDepthBeforePush
      }

      appPushCount += 1
      appPushesAfterFrameEntry += 1
    },
    goBack() {
      const frameDepth = Math.max(0, window.history.length - baseline - appPushCount)
      if (frameDepth <= 0) {
        return false
      }

      if (frameDepth > knownFrameDepth) {
        appPushesAfterFrameEntry = 0
      }
      knownFrameDepth = frameDepth

      // Skip app tab entries and return to the previous frame entry
      const distance = appPushesAfterFrameEntry + 1
      window.history.go(-distance)
      baseline += distance
      appPushCount -= appPushesAfterFrameEntry
      appPushesAfterFrameEntry = 0
      knownFrameDepth -= 1
      return true
    },
  }
}
