import { Modal as AntModal, type ModalProps } from 'antd'
import './modal.css'

function QmuiModal({ rootClassName, ...props }: ModalProps) {
  return (
    <AntModal
      {...props}
      rootClassName={['qm-modal', rootClassName].filter(Boolean).join(' ')}
    />
  )
}

export default QmuiModal
export type { ModalProps as QmuiModalProps }
