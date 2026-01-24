import { useLayoutEffect } from 'react'

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
export function useEvent(...args: Parameters<typeof window.addEventListener>) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener(...args)
    return () => window.removeEventListener(...args)
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [...args])
}
