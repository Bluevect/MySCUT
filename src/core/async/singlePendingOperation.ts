export type PendingStateListener = (isPending: boolean) => void

export type PendingOperationResult<T> =
  | { started: false }
  | { started: true; value: T }

export class SinglePendingOperation {
  private pending = false

  get isPending() {
    return this.pending
  }

  async run<T>(
    operation: () => Promise<T> | T,
    onPendingChange?: PendingStateListener,
  ): Promise<PendingOperationResult<T>> {
    if (this.pending) {
      return { started: false }
    }

    this.pending = true
    onPendingChange?.(true)

    try {
      return {
        started: true,
        value: await operation(),
      }
    } finally {
      this.pending = false
      onPendingChange?.(false)
    }
  }
}
