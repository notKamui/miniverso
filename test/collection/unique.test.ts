import { describe, expect, it } from 'bun:test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.unique', () => {
  it('deduplicates while preserving first-seen order', () => {
    expect(Collection.unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2])
  })

  it('handles strings', () => {
    expect(Collection.unique(['a', 'b', 'a'])).toEqual(['a', 'b'])
  })
})
