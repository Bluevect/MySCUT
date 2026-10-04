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

function ReturnToCurrentWeekButton({ inferredCurrentWeek, onReturn }: ReturnToCurrentWeekButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
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
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

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

  const finishPointerInteraction = (event: ReactPointerEvent<HTMLButtonElement>, canceled: boolean) => {
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
      onReturn()
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

    onReturn()
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
      type='button'
      className={`return-current-week-fab ${isDragging ? 'is-dragging' : ''}`}
      style={positionStyle}
      aria-label={`回到当前周，第 ${inferredCurrentWeek} 周`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <AimOutlined aria-hidden='true' />
      <span>回到当前周</span>
    </button>
  )
}

export default ReturnToCurrentWeekButton
