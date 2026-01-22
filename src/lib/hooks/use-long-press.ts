import { type MouseEvent, type TouchEvent, type UIEvent, useMemo, useRef } from 'react'
import { isMouseEvent, isTouchEvent } from '@/lib/utils/events'

export type LongPressOptions = {
  threshold?: number
  onStart?: (e: UIEvent) => void
  onFinish?: (e: UIEvent) => void
  onCancel?: (e: UIEvent) => void
}

export type LongPressFunctions = {
  onMouseDown: (e: MouseEvent) => void
  onMouseUp: (e: MouseEvent) => void
  onMouseLeave: (e: MouseEvent) => void
  onTouchStart: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
}

export function useLongPress(
  callback: (e: UIEvent) => void,
  options: LongPressOptions = {},
): LongPressFunctions {
  const { threshold = 400, onStart, onFinish, onCancel } = options
  const isLongPressActive = useRef(false)
  const isPressed = useRef(false)
  const timerId = useRef<NodeJS.Timeout | null>(null)

  return useMemo(() => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }

    function start(event: MouseEvent | TouchEvent) {
      if (!isMouseEvent(event) && !isTouchEvent(event)) return

      onStart?.(event)

      isPressed.current = true
      timerId.current = setTimeout(() => {
        callback(event)
        isLongPressActive.current = true
      }, threshold)
    }

    function cancel(event: MouseEvent | TouchEvent) {
      if (!isMouseEvent(event) && !isTouchEvent(event)) return

      if (isLongPressActive.current) onFinish?.(event)
      else if (isPressed.current) onCancel?.(event)

      isLongPressActive.current = false
      isPressed.current = false

      if (timerId.current) clearTimeout(timerId.current)
    }

    return {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
    }
  }, [callback, threshold, onStart, onFinish, onCancel])
}
