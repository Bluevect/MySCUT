import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import './picker.css'

export type QmuiWheelPickerOption<T extends string | number> = {
  value: T
  label: string
}

type QmuiWheelPickerProps<T extends string | number> = {
  value: T
  options: QmuiWheelPickerOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  itemHeight?: number
  visibleItems?: number
  showBackground?: boolean
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function QmuiWheelPicker<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  itemHeight = 40,
  visibleItems = 5,
  showBackground = true,
}: QmuiWheelPickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)
  const activeIndex = options.findIndex((option) => option.value === value)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || activeIndex < 0) {
      return
    }

    const currentIndex = clamp(
      Math.round(scrollContainer.scrollTop / itemHeight),
      0,
      Math.max(options.length - 1, 0),
    )
    const shouldAnimate = hasMountedRef.current
    hasMountedRef.current = true
    if (currentIndex === activeIndex) {
      return
    }

    scrollContainer.scrollTo({
      top: activeIndex * itemHeight,
      behavior: shouldAnimate ? 'smooth' : 'auto',
    })
  }, [activeIndex, itemHeight, options.length])

  const handleScroll = () => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || options.length === 0) {
      return
    }

    const nextIndex = clamp(
      Math.round(scrollContainer.scrollTop / itemHeight),
      0,
      options.length - 1,
    )
    const nextOption = options[nextIndex]
    if (nextOption && nextOption.value !== value) {
      onChange(nextOption.value)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (activeIndex < 0 || options.length === 0) {
      return
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? -1 : 1
    const nextIndex = clamp(activeIndex + direction, 0, options.length - 1)
    onChange(options[nextIndex].value)
  }

  const style = {
    '--qm-wheel-item-height': `${itemHeight}px`,
    '--qm-wheel-visible-items': visibleItems,
  } as CSSProperties

  return (
    <div
      className={`qm-wheel-picker${showBackground ? '' : ' is-backgroundless'}${
        className ? ` ${className}` : ''
      }`}
      style={style}
      role="listbox"
      aria-label={ariaLabel}
    >
      <span className="qm-wheel-picker__highlight" aria-hidden="true" />
      <div
        ref={scrollRef}
        className="qm-wheel-picker__scroll"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className={`qm-wheel-picker__item${
              option.value === value ? ' is-active' : ''
            }`}
            role="option"
            aria-selected={option.value === value}
            tabIndex={-1}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QmuiWheelPicker
export type { QmuiWheelPickerProps }
