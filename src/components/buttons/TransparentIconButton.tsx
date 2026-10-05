import type { ButtonProps } from 'antd'
import { Button } from 'antd'
import type { ReactNode } from 'react'

type TransparentIconButtonProps = {
  icon: ReactNode
  ariaLabel: string
  className?: string
} & Pick<ButtonProps, 'disabled' | 'htmlType' | 'onClick'>

export function TransparentIconButton({
  icon,
  ariaLabel,
  className,
  disabled,
  htmlType,
  onClick,
}: TransparentIconButtonProps) {
  return (
    <Button
      type='text'
      icon={icon}
      aria-label={ariaLabel}
      className={`app-icon-button-transparent${className ? ` ${className}` : ''}`}
      disabled={disabled}
      htmlType={htmlType}
      onClick={onClick}
    />
  )
}
