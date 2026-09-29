import { Modal, type ModalFuncProps } from 'antd'
import { useEffect, useRef } from 'react'
import { registerBackDismiss } from '../../core/navigation/backDismiss'

type DismissableModal = {
  destroy: () => void
}

type BackDismissableModal = DismissableModal & {
  // Destroy the dialog and stop intercepting back; imperative dialogs must call this when their host unmounts
  close: () => void
}

// Declare an overlay that back closes: while it is open, back dismisses it instead of leaving the page
// Dismissal should match the overlay's own cancel action
export function useBackDismiss(open: boolean, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!open) {
      return
    }

    return registerBackDismiss(() => {
      onDismissRef.current()
    })
  }, [open])
}

function createBackDismissableModal(show: (config: ModalFuncProps) => DismissableModal) {
  return (config: ModalFuncProps): BackDismissableModal => {
    let unregister: (() => void) | null = null
    const instance = show({
      ...config,
      afterClose: () => {
        unregister?.()
        unregister = null
        config.afterClose?.()
      },
    })

    unregister = registerBackDismiss(() => instance.destroy())

    return {
      ...instance,
      close: () => {
        unregister?.()
        unregister = null
        instance.destroy()
      },
    }
  }
}

// Modal.confirm wrapper: back behaves like the cancel button
export const confirmWithBackDismiss = createBackDismissableModal((config) => Modal.confirm(config))

// Modal.info wrapper: back closes the notice
export const infoWithBackDismiss = createBackDismissableModal((config) => Modal.info(config))
