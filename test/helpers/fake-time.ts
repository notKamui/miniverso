import { jest } from 'bun:test'

export function installFakeNow() {
  jest.useFakeTimers()
  function advance(ms: number) {
    // @ts-expect-error TODO: Remove when Bun's jest types include advanceTimersByTime in types
    const next = jest.advanceTimersByTime(ms)
    return next.now()
  }
  function restore() {
    jest.useRealTimers()
  }
  return { advance, restore }
}

export function withFakeNow<T>(
  fn: (ctrl: { advance: (ms: number) => number }) => T,
): T {
  const { advance, restore } = installFakeNow()
  try {
    return fn({ advance })
  } finally {
    restore()
  }
}
