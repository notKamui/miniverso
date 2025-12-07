import { jest } from 'bun:test'

export function installFakeTime() {
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

export function withFakeTime<T>(
  fn: (ctrl: { advance: (ms: number) => number }) => T,
): T {
  const { advance, restore } = installFakeTime()
  try {
    return fn({ advance })
  } finally {
    restore()
  }
}
