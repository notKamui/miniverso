import { jest } from 'bun:test'

export function installFakeTime() {
  jest.useFakeTimers()
  function advance(ms: number) {
    jest.advanceTimersByTime(ms)
    return Date.now()
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
