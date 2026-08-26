import { useLayoutEffect, useRef } from 'react'

export function useEvent<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions,
): void
export function useEvent(
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void
export function useEvent(
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  const listenerRef = useRef(listener)
  const optionsRef = useRef(options)

  useLayoutEffect(() => {
    listenerRef.current = listener
    optionsRef.current = options
  })

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const handleEvent: EventListener = (event) => {
      const current = listenerRef.current
      if (typeof current === 'function') {
        current(event)
      } else {
        current.handleEvent(event)
      }
    }

    const currentOptions = optionsRef.current
    window.addEventListener(type, handleEvent, currentOptions)
    return () => window.removeEventListener(type, handleEvent, currentOptions)
  }, [type])
}
