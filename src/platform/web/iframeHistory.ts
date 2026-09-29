export type IframeHistory = {
  reset: () => void
  goBack: () => boolean
}

// The app and the iframe share one session history, so every iframe navigation still adds an entry the app
// can count; cross-origin frames hide their own history, which leaves that count as the only way to walk it
export function createIframeHistory(): IframeHistory {
  let baseline = window.history.length

  return {
    // Entries from before this point are out of reach once the app or the frame document moves on
    reset() {
      baseline = window.history.length
    },
    goBack() {
      if (window.history.length <= baseline) {
        return false
      }

      // The newest entry belongs to the frame, so the traversal returns it to its previous page
      window.history.back()
      baseline += 1
      return true
    },
  }
}
