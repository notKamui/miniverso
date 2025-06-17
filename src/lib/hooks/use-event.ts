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
  // biome-ignore lint/correctness/useExhaustiveDependencies: All of the args are dependencies
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener(...args)
    return () => window.removeEventListener(...args)
  }, args)
}
