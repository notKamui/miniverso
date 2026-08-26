import {
  type DependencyList,
  type EffectCallback,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handle = setTimeout(
      () => {
        setDebouncedValue(value)
      },
      Math.max(0, delayMs),
    )

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

function depsChanged(prev: DependencyList, next: DependencyList) {
  if (prev.length !== next.length) return true
  return next.some((dep, index) => !Object.is(dep, prev[index]))
}

/**
 * Like `useEffect`, but waits `delayMs` after the dependency list settles
 * before running `effect`.
 *
 * Uses `useEffectEvent` for the callback (always-latest, not a dependency) and
 * React's "adjust state during render" pattern to turn a `DependencyList` into
 * a stable `committedDeps` value the effect can list without `...deps` spreads
 * or render-time ref access — both of which React Compiler lint rejects.
 */
export function useDebouncedEffect(effect: EffectCallback, deps: DependencyList, delayMs: number) {
  const onEffect = useEffectEvent((_signal: DependencyList) => effect())
  const [committedDeps, setCommittedDeps] = useState(deps)

  if (depsChanged(committedDeps, deps)) {
    setCommittedDeps(deps)
  }

  useEffect(() => {
    let closer: ReturnType<EffectCallback> | undefined
    const handler = setTimeout(() => {
      // Pass committedDeps so the compiler treats it as a used dependency
      // (it is the debounce re-arm signal when the caller's deps change).
      closer = onEffect(committedDeps)
    }, delayMs)

    return () => {
      clearTimeout(handler)
      closer?.()
    }
  }, [delayMs, committedDeps])
}
