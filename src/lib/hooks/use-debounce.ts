import { type DependencyList, type EffectCallback, useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) {
      setDebouncedValue(value)
      return
    }

    const handle = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debouncedValue
}

export function useDebouncedFn<T>(value: T, delayMs: number, fn: (value: T) => void) {
  useEffect(() => {
    if (delayMs <= 0) {
      fn(value)
      return
    }

    const handle = setTimeout(() => {
      fn(value)
    }, delayMs)

    return () => clearTimeout(handle)
  }, [delayMs, fn, value])
}

export function useDebouncedEffect(effect: EffectCallback, deps: DependencyList, delayMs: number) {
  useEffect(() => {
    let closer: ReturnType<EffectCallback> | undefined
    const handler = setTimeout(() => {
      closer = effect()
    }, delayMs)

    return () => {
      clearTimeout(handler)
      closer?.()
    }
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [...(deps || []), delayMs])
}
