import { vi } from 'vite-plus/test'

export function installFakeTime() {
  vi.useFakeTimers()
  function advance(ms: number) {
    vi.advanceTimersByTime(ms)
    return Date.now()
  }
  function restore() {
    vi.useRealTimers()
  }
  return { advance, restore }
}

export function withFakeTime<T>(fn: (ctrl: { advance: (ms: number) => number }) => T): T {
  const { advance, restore } = installFakeTime()
  try {
    return fn({ advance })
  } finally {
    restore()
  }
}
