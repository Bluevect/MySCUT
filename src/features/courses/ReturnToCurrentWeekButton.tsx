import { AimOutlined } from '@ant-design/icons'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

const VIEWPORT_EDGE_GAP = 12
const DRAG_START_THRESHOLD = 4
const RIPPLE_DURATION_MS = 620
const RETURN_DELAY_MS = 120

type Position = {
  left: number
  top: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startLeft: number
  startTop: number
  width: number
  height: number
  hasMoved: boolean
  hasPointerCapture: boolean
}

type ReturnToCurrentWeekButtonProps = {
  inferredCurrentWeek: number
  onReturn: () => void
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function getAvailableBottom() {
  const bottomNav = document.querySelector<HTMLElement>('.app-tabbar')
  return bottomNav?.getBoundingClientRect().top ?? window.innerHeight
}

function clampPosition(position: Position, width: number, height: number) {
  const maximumLeft = window.innerWidth - width - VIEWPORT_EDGE_GAP
  const maximumTop = getAvailableBottom() - height - VIEWPORT_EDGE_GAP

  return {
    left: clamp(position.left, VIEWPORT_EDGE_GAP, maximumLeft),
    top: clamp(position.top, VIEWPORT_EDGE_GAP, maximumTop),
  }
}

function createRippleElement(button: HTMLButtonElement, clientX: number, clientY: number) {
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2.4
  const ripple = document.createElement('span')

  ripple.className = 'return-current-week-fab-ripple'
  ripple.setAttribute('aria-hidden', 'true')
  ripple.style.left = `${clientX - rect.left}px`
  ripple.style.top = `${clientY - rect.top}px`
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })

  button.appendChild(ripple)
  window.setTimeout(() => ripple.remove(), RIPPLE_DURATION_MS + 200)
}

function ReturnToCurrentWeekButton({
  inferredCurrentWeek,
  onReturn,
}: ReturnToCurrentWeekButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const returnTimeoutRef = useRef<number | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const button = buttonRef.current
      if (!button) {
        return
      }

      setPosition((currentPosition) => {
        if (!currentPosition) {
          return currentPosition
        }

        const rect = button.getBoundingClientRect()
        return clampPosition(currentPosition, rect.width, rect.height)
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (returnTimeoutRef.current !== null) {
        window.clearTimeout(returnTimeoutRef.current)
      }
    }
  }, [])

  const scheduleReturn = () => {
    if (returnTimeoutRef.current !== null) {
      return
    }

    returnTimeoutRef.current = window.setTimeout(() => {
      returnTimeoutRef.current = null
      onReturn()
    }, RETURN_DELAY_MS)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    createRippleElement(event.currentTarget, event.clientX, event.clientY)
    suppressClickRef.current = false
    const rect = event.currentTarget.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
      hasMoved: false,
      hasPointerCapture: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    if (!dragState.hasMoved && Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD) {
      return
    }

    dragState.hasMoved = true
    if (!dragState.hasPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragState.hasPointerCapture = true
    }

    event.preventDefault()
    setIsDragging(true)
    setPosition(
      clampPosition(
        {
          left: dragState.startLeft + deltaX,
          top: dragState.startTop + deltaY,
        },
        dragState.width,
        dragState.height,
      ),
    )
  }

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    canceled: boolean,
  ) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const wasTap = !canceled && !dragState.hasMoved
    suppressClickRef.current = !canceled
    dragStateRef.current = null
    setIsDragging(false)

    if (dragState.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (wasTap) {
      scheduleReturn()
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerInteraction(event, false)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerInteraction(event, true)
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    scheduleReturn()
  }

  const positionStyle: CSSProperties | undefined = position
    ? {
        left: `${position.left}px`,
        top: `${position.top}px`,
        right: 'auto',
        bottom: 'auto',
      }
    : undefined

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`return-current-week-fab ${isDragging ? 'is-dragging' : ''}`}
      style={positionStyle}
      aria-label={`回到当前周，第 ${inferredCurrentWeek} 周`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <AimOutlined aria-hidden="true" />
      <span>回到当前周</span>
    </button>
  )
}

export default ReturnToCurrentWeekButton
