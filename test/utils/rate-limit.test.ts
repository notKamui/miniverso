import { describe, expect, it } from 'bun:test'
import { createTokenBucketManager } from '../../src/lib/utils/rate-limit'

describe('createTokenBucketManager', () => {
  it('allows initial consumption up to max and then blocks until refill', async () => {
    const manager = createTokenBucketManager<string>(3, 1) // max=3, refill 1 token/sec
    const key = 'k1'
    // First consume: bucket created with count = max - cost
    expect(manager.consume(key, 1)).toBe(true) // remaining 2
    expect(manager.consume(key, 2)).toBe(true) // remaining 0
    expect(manager.consume(key, 1)).toBe(false) // blocked
    // Wait ~1 second to refill 1 token
    await new Promise((r) => setTimeout(r, 1100))
    expect(manager.consume(key, 1)).toBe(true) // remaining 0 again
  })

  it('supports varying costs after partial refill', async () => {
    const manager = createTokenBucketManager<string>(5, 1)
    const key = 'heavy'
    expect(manager.consume(key, 5)).toBe(true) // empty
    expect(manager.consume(key, 1)).toBe(false)
    // Wait ~2.5s to refill at least 2 tokens
    await new Promise((r) => setTimeout(r, 2500))
    // With 2 tokens, cost 3 should fail
    expect(manager.consume(key, 3)).toBe(false)
    // But cost 2 should pass and drop to 0
    expect(manager.consume(key, 2)).toBe(true)
  })

  it('clamps refill to max using small capacity', async () => {
    const manager = createTokenBucketManager<string>(2, 1)
    const key = 'cap'
    expect(manager.consume(key, 2)).toBe(true) // empty
    expect(manager.consume(key, 1)).toBe(false)
    // Wait ~3s to ensure at least 3 tokens would accrue without clamping
    await new Promise((r) => setTimeout(r, 3000))
    // Should be clamped at max=2: cost 3 must fail
    expect(manager.consume(key, 3)).toBe(false)
    // But cost 2 should pass
    expect(manager.consume(key, 2)).toBe(true)
  })
})
