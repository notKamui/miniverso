import { describe, expect, it } from 'vite-plus/test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.invertRecord', () => {
  it('inverts a string record', () => {
    const input = {
      en: 'hello',
      fr: 'bonjour',
    } as const

    const inverted = Collection.invertRecord(input)

    expect(inverted).toEqual({
      hello: 'en',
      bonjour: 'fr',
    })
  })

  it('preserves literal value keys in type output', () => {
    const inverted = Collection.invertRecord({
      draft: 'D',
      published: 'P',
    } as const)

    const draftKey: 'draft' = inverted.D
    const publishedKey: 'published' = inverted.P

    expect(draftKey).toBe('draft')
    expect(publishedKey).toBe('published')
  })

  it('supports number and symbol values as output keys', () => {
    const sym = Symbol('active')
    const inverted = Collection.invertRecord({
      first: 1,
      second: sym,
    } as const)

    expect(inverted[1]).toBe('first')
    expect(inverted[sym]).toBe('second')
  })

  it('uses last key on duplicate values', () => {
    const inverted = Collection.invertRecord({
      first: 'shared',
      second: 'shared',
    } as const)

    expect(inverted.shared).toBe('second')
  })
})
