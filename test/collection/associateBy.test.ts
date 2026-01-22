import { describe, expect, it } from 'bun:test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.associateBy', () => {
  it('associates by computed key', () => {
    const users = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Linus' },
    ]
    const byId = Collection.associateBy(users, (u) => u.id)
    expect(byId).toEqual({
      1: { id: 1, name: 'Ada' },
      2: { id: 2, name: 'Grace' },
      3: { id: 3, name: 'Linus' },
    })
  })

  it('overwrites on duplicate keys with last occurrence', () => {
    const entries = [
      { k: 'x', v: 1 },
      { k: 'y', v: 2 },
      { k: 'x', v: 3 },
    ]
    const byK = Collection.associateBy(entries, (e) => e.k)
    expect(byK).toEqual({ x: { k: 'x', v: 3 }, y: { k: 'y', v: 2 } })
  })

  it('supports string, number, and symbol keys', () => {
    const sym = Symbol('s')
    const items: { key: string | number | symbol; val: number }[] = [
      { key: 'a', val: 1 },
      { key: 2, val: 2 },
      { key: sym, val: 3 },
    ]
    const byKey = Collection.associateBy(items, (i) => i.key)
    // Symbol keys are not visible in JSON, check via direct access
    expect(byKey.a).toEqual({ key: 'a', val: 1 })
    expect(byKey[2]).toEqual({ key: 2, val: 2 })
    expect(byKey[sym]).toEqual({ key: sym, val: 3 })
  })

  it('returns empty record for empty array', () => {
    const res = Collection.associateBy([] as { id: number }[], (x) => x.id)
    expect(res).toEqual({})
  })

  it('does not mutate input array', () => {
    const arr = [{ id: 1 }, { id: 2 }]
    const snapshot = JSON.parse(JSON.stringify(arr))
    Collection.associateBy(arr, (x) => x.id)
    expect(arr).toEqual(snapshot)
  })

  it('handles symbol key collisions by last-wins semantics', () => {
    const s = Symbol('same')
    const arr = [
      { k: s, n: 1 },
      { k: s, n: 2 },
    ]
    const rec = Collection.associateBy(arr, (x) => x.k)
    expect(rec[s]).toEqual({ k: s, n: 2 })
  })

  it('supports complex key selectors', () => {
    const arr = [
      { name: 'Ada', age: 30 },
      { name: 'Ada', age: 31 },
      { name: 'Grace', age: 40 },
    ]
    const rec = Collection.associateBy(arr, (x) => `${x.name}:${x.age > 30 ? 'senior' : 'junior'}`)
    expect(Object.keys(rec).toSorted()).toEqual(['Ada:junior', 'Ada:senior', 'Grace:senior'])
    expect(rec['Ada:junior']).toEqual({ name: 'Ada', age: 30 })
    expect(rec['Ada:senior']).toEqual({ name: 'Ada', age: 31 })
    expect(rec['Grace:senior']).toEqual({ name: 'Grace', age: 40 })
  })

  it('works with large arrays without stack overflow', () => {
    const N = 5000
    const arr = Array.from({ length: N }, (_, i) => ({ i }))
    const rec = Collection.associateBy(arr, (x) => x.i)
    expect(Object.keys(rec)).toHaveLength(N)
    expect(rec[0]).toEqual({ i: 0 })
    expect(rec[N - 1]).toEqual({ i: N - 1 })
  })
})
