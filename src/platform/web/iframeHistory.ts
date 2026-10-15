export type IframeHistory = {
  reset: () => void
  noteAppPush: () => void
  goBack: (isCurrentPage?: () => boolean) => boolean | Promise<boolean>
}

export type IndexedHistory = {
  getIndex: () => Promise<number>
  goBack: (fromIndex: number, toIndex: number) => Promise<number>
}

// Android exposes the actual joint-history cursor, including cross-origin frames.
// Unlike history.length, this cursor moves back and survives forward-history replacement.
export function createIndexedIframeHistory(history: IndexedHistory): IframeHistory {
  let rootIndex = 0
  let appEntries = new Set<number>()
  let failure: unknown = null
  let queue = Promise.resolve()
  let pendingBack: Promise<boolean> | null = null

  const recordPosition = (apply: (index: number) => void) => {
    // Capture now, but apply in order, so queued back operations cannot reorder tab markers.
    const operation = Promise.all([queue, history.getIndex()]).then(([, index]) => apply(index))
    queue = operation.catch((error: unknown) => {
      failure = error
      console.error('Failed to track manual history:', error)
    })
  }

  const reset = () => {
    recordPosition((index) => {
      rootIndex = index
      appEntries.clear()
      failure = null
    })
  }
  reset()

  return {
    reset,
    noteAppPush() {
      recordPosition((index) => {
        // A push replaces any forward branch left behind by an earlier back.
        appEntries = new Set([...appEntries].filter((entry) => entry < index))
        if (index > rootIndex) appEntries.add(index)
      })
    },
    goBack(isCurrentPage = () => true) {
      if (pendingBack) return pendingBack

      const operation = queue.then(async () => {
        if (failure) throw failure
        const index = await history.getIndex()
        if (!isCurrentPage()) return true
        const appEntryCount = [...appEntries].filter(
          (entry) => entry > rootIndex && entry <= index,
        ).length
        if (index - rootIndex - appEntryCount <= 0) return false

        let frameIndex = index
        while (appEntries.has(frameIndex)) frameIndex -= 1
        const targetIndex = frameIndex - 1
        const reachedIndex = await history.goBack(index, targetIndex)
        if (reachedIndex === targetIndex) {
          appEntries = new Set([...appEntries].filter((entry) => entry <= targetIndex))
        }
        // A stale request is still consumed; it must not trigger an app-level fallback.
        return true
      })
      pendingBack = operation.finally(() => {
        pendingBack = null
      })
      queue = pendingBack.then(
        () => undefined,
        () => undefined,
      )
      return pendingBack
    },
  }
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
