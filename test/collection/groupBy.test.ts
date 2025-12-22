import { describe, expect, it } from 'bun:test'
import { Collection } from '../../src/lib/utils/collection'

describe('Collection.groupBy', () => {
  it('groups numbers by parity (number keys)', () => {
    const input = [1, 2, 3, 4, 5]
    const res = Collection.groupBy(input, (n) => n % 2)
    expect(res[0]).toEqual([2, 4])
    expect(res[1]).toEqual([1, 3, 5])
  })

  it('preserves input order within each group', () => {
    const input = [1, 3, 2, 4, 6, 5]
    const res = Collection.groupBy(input, (n) => n % 2)
    expect(res[0]).toEqual([2, 4, 6])
    expect(res[1]).toEqual([1, 3, 5])
  })

  it('groups strings by first letter (string keys)', () => {
    const words = ['apple', 'banana', 'apricot', 'blue', 'avocado']
    const res = Collection.groupBy(words, (w) => w[0]!)
    expect(res.a).toEqual(['apple', 'apricot', 'avocado'])
    expect(res.b).toEqual(['banana', 'blue'])
  })

  it('returns empty object for empty input', () => {
    const res = Collection.groupBy([] as number[], (n) => n % 2)
    expect(res).toEqual({})
  })

  it('supports symbol keys and they are retrievable via symbol access', () => {
    const s1 = Symbol('s1')
    const s2 = Symbol('s2')
    const items = [
      { k: s1, v: 1 },
      { k: s2, v: 2 },
      { k: s1, v: 3 },
    ]
    const res = Collection.groupBy(items, (i) => i.k)
    expect(res[s1]).toEqual([
      { k: s1, v: 1 },
      { k: s1, v: 3 },
    ])
    expect(res[s2]).toEqual([{ k: s2, v: 2 }])
    // Symbol keys do not appear in Object.keys, but do in getOwnPropertySymbols
    const syms = Object.getOwnPropertySymbols(res)
    expect(syms).toContain(s1)
    expect(syms).toContain(s2)
  })

  it('propagates key selector errors', () => {
    const boom = new Error('boom')
    const fn = () =>
      Collection.groupBy([1, 2, 3], () => {
        throw boom
      })
    expect(fn).toThrow(boom)
  })

  it('handles sparse arrays and explicit undefined values', () => {
    const arr = [] as (number | undefined)[]
    // create a hole at index 0
    arr[1] = 1
    arr[2] = undefined
    arr[3] = 2
    const res = Collection.groupBy(arr, (v) =>
      v === undefined ? 'undef' : 'val',
    )
    expect(res.undef).toEqual([undefined])
    expect(res.val).toEqual([1, 2])
  })

  it('works with large arrays and many buckets', () => {
    const N = 10_000
    const res = Collection.groupBy(
      Array.from({ length: N }, (_, i) => i),
      (i) => i % 10,
    )
    for (let k = 0; k <= 9; k++) {
      const group = res[k]!
      expect(group.length).toBe(N / 10)
      expect(group[0]).toBe(k)
      expect(group[1]).toBe(k + 10)
      expect(group.at(-1)).toBe(N - (10 - k))
    }
  })
})
