import { describe, expect, it, vi } from 'vitest'
import { SinglePendingOperation } from '../../../src/core/async/singlePendingOperation'

describe('SinglePendingOperation', () => {
  it('runs only one operation while the first one is pending', async () => {
    let releaseFirstOperation = () => undefined
    const firstOperation = new Promise<string>((resolve) => {
      releaseFirstOperation = () => resolve('saved')
    })
    const operation = new SinglePendingOperation()
    const firstRun = operation.run(() => firstOperation)
    const duplicateRun = await operation.run(() => Promise.resolve('duplicate'))

    expect(operation.isPending).toBe(true)
    expect(duplicateRun).toEqual({ started: false })

    releaseFirstOperation()
    await expect(firstRun).resolves.toEqual({ started: true, value: 'saved' })
    expect(operation.isPending).toBe(false)
  })

  it('always clears pending state after a failure', async () => {
    const onPendingChange = vi.fn()
    const operation = new SinglePendingOperation()

    await expect(operation.run(async () => {
      throw new Error('TEST failure')
    }, onPendingChange)).rejects.toThrow('TEST failure')

    expect(operation.isPending).toBe(false)
    expect(onPendingChange.mock.calls).toEqual([[true], [false]])
    await expect(operation.run(() => 'retried')).resolves.toEqual({
      started: true,
      value: 'retried',
    })
  })
})
