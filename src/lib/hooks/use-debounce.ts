import { useEffect, useState } from 'react'

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

export function useDebouncedFn<T>(
  value: T,
  delayMs: number,
  fn: (value: T) => void,
) {
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
