export function installFakeNow(seedMs: number) {
  const original = Date.now
  let current = seedMs
  ;(Date.now as any) = () => current
  const advance = (ms: number) => {
    current += ms
    return current
  }
  const restore = () => {
    ;(Date.now as any) = original
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
