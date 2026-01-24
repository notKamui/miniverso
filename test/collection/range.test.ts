import { describe, expect, it } from 'bun:test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.range', () => {
  it('creates a range from first to lastExcluded-1', () => {
    expect(Collection.range(0, 5)).toEqual([0, 1, 2, 3, 4])
    expect(Collection.range(2, 6)).toEqual([2, 3, 4, 5])
  })

  it('returns empty array when first === lastExcluded', () => {
    expect(Collection.range(3, 3)).toEqual([])
  })

  it('throws when lastExcluded < first', () => {
    expect(() => Collection.range(5, 4)).toThrow('lastExcluded must be greater than first')
    expect(() => Collection.range(1, -1)).toThrow('lastExcluded must be greater than first')
  })

  it('handles large ranges efficiently enough (spot check boundaries)', () => {
    const n = 10_000
    const arr = Collection.range(0, n)
    expect(arr.length).toBe(n)
    expect(arr[0]).toBe(0)
    expect(arr[9999]).toBe(9999)
  })

  it('supports negative starts', () => {
    expect(Collection.range(-2, 3)).toEqual([-2, -1, 0, 1, 2])
  })

  it('result is a new array that can be independently mutated by caller', () => {
    const arr = Collection.range(1, 4) // [1,2,3]
    arr.push(99)
    expect(arr).toEqual([1, 2, 3, 99])
    // generating again yields a fresh array
    expect(Collection.range(1, 4)).toEqual([1, 2, 3])
  })
})
