import type { UIEvent } from 'react'

export function isMouseEvent(event: UIEvent): boolean {
  return event.nativeEvent instanceof MouseEvent
}

export function isTouchEvent(event: UIEvent): boolean {
  return window.TouchEvent
    ? event.nativeEvent instanceof TouchEvent
    : 'touches' in event.nativeEvent
}
