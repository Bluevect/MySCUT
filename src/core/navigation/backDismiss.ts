type BackDismissHandler = () => void

type BackDismissEntry = {
  id: number
  dismiss: BackDismissHandler
}

const entries: BackDismissEntry[] = []
let nextEntryId = 1

// Register an overlay that back closes first; returns an unregister function
export function registerBackDismiss(dismiss: BackDismissHandler) {
  const entry: BackDismissEntry = {
    id: nextEntryId,
    dismiss,
  }
  nextEntryId += 1
  entries.push(entry)

  return () => {
    const index = entries.findIndex((candidate) => candidate.id === entry.id)
    if (index >= 0) {
      entries.splice(index, 1)
    }
  }
}

// Close the most recently registered overlay; false when none is open
export function dismissTopBackOverlay() {
  const entry = entries.pop()
  if (!entry) {
    return false
  }

  entry.dismiss()
  return true
}
