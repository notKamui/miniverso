import { setSystemTime } from 'bun:test'

export function installFakeNow(seedMs: number) {
  setSystemTime(seedMs)
  function advance(ms: number) {
    const next = Date.now() + ms
    setSystemTime(next)
    return next
  }
  function restore() {
    setSystemTime()
  }
  return { advance, restore }
}

export function withFakeNow<T>(
  seedMs: number,
  fn: (ctrl: { advance: (ms: number) => number }) => T,
): T {
  const { advance, restore } = installFakeNow(seedMs)
  try {
    return fn({ advance })
  } finally {
    restore()
  }
}
