import { describe, expect, it } from 'bun:test'
import { buildObject } from '../../src/lib/utils/build-object'

describe('buildObject', () => {
  it('merges truthy values from multiple objects', () => {
    const res = buildObject(
      { a: 1, b: 0, c: '', d: null, e: undefined, f: false, g: true },
      { h: 'x', i: 2 },
    )
    expect(res).toEqual({ a: 1, g: true, h: 'x', i: 2 })
    expect('b' in res).toBe(false)
    expect('c' in res).toBe(false)
    expect('d' in res).toBe(false)
    expect('e' in res).toBe(false)
    expect('f' in res).toBe(false)
  })

  it('skips non-object inputs', () => {
    const res = buildObject(false as any, null as any, undefined as any, {
      a: 1,
    })
    expect(res).toEqual({ a: 1 })
  })

  it('later objects override earlier ones for truthy values', () => {
    const res = buildObject({ a: 1, b: 'x' }, { a: 2, b: 'y' })
    expect(res).toEqual({ a: 2, b: 'y' })
  })

  it('does not deep-merge; assigns nested objects as-is', () => {
    const nested = { n: { x: 1 } }
    const res = buildObject({ n: { x: 0 } }, nested)
    expect(res.n).toBe(nested.n)
    expect(res).toEqual({ n: { x: 1 } })
  })
})
