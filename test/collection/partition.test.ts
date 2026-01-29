import { describe, expect, it, mock } from 'bun:test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.partition', () => {
  it('partitions evens and odds while preserving order', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const [evens, odds] = Collection.partition(input, (n) => n % 2 === 0)
    expect(evens).toEqual([2, 4, 6])
    expect(odds).toEqual([1, 3, 5])
  })

  it('returns all elements in the first array when predicate always true', () => {
    const input = ['a', 'b', 'c']
    const [truthy, falsy] = Collection.partition(input, () => true)
    expect(truthy).toEqual(['a', 'b', 'c'])
    expect(falsy).toEqual([])
  })

  it('returns all elements in the second array when predicate always false', () => {
    const input = ['a', 'b', 'c']
    const [truthy, falsy] = Collection.partition(input, () => false)
    expect(truthy).toEqual([])
    expect(falsy).toEqual(['a', 'b', 'c'])
  })

  it('handles empty input', () => {
    const [truthy, falsy] = Collection.partition([], () => true)
    expect(truthy).toEqual([])
    expect(falsy).toEqual([])
  })

  it('does not mutate the original array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    Collection.partition(input, (n) => n > 1)
    expect(input).toEqual(copy)
  })

  it('calls predicate for each element', () => {
    const input = [10, 20, 30]
    const predicate = mock((n: number) => n > 15)
    const [gt, le] = Collection.partition(input, predicate)
    expect(predicate).toHaveBeenCalledTimes(3)
    expect(gt).toEqual([20, 30])
    expect(le).toEqual([10])
  })

  it('propagates predicate errors', () => {
    const input = [1, 2, 3]
    const err = new Error('boom')
    const throwing = () =>
      Collection.partition(input, () => {
        throw err
      })
    expect(throwing).toThrow(err)
  })

  it('handles sparse arrays (skips holes) and explicit undefined values', () => {
    const arr = [] as (number | undefined)[]
    // create a sparse array with a hole at index 0
    arr[1] = 1
    arr[2] = undefined
    arr[3] = 2
    const [undefs, rest] = Collection.partition(arr, (v) => v === undefined)
    expect(undefs).toEqual([undefined])
    expect(rest).toEqual([1, 2])
  })

  it('can partition by truthiness using Boolean coercion', () => {
    const values = [0, 1, Number.NaN, 2, '', 'a', false, true, null, undefined]
    const [truthy, falsy] = Collection.partition(values, Boolean)
    expect(truthy).toEqual([1, 2, 'a', true])
    expect(falsy).toEqual([0, Number.NaN, '', false, null, undefined])
  })

  it('preserves object identity in output buckets', () => {
    const a = { id: 'a' }
    const b = { id: 'b' }
    const c = { id: 'c' }
    const [bs, others] = Collection.partition([a, b, c], (o) => o.id === 'b')
    expect(bs).toHaveLength(1)
    expect(bs[0]).toBe(b)
    expect(others).toEqual([a, c])
    expect(others[0]).toBe(a)
    expect(others[1]).toBe(c)
  })
})
