import { expectTypeOf, test } from 'vite-plus/test'
import { Collection } from '@/lib/utils/collection'

test('Collection.invertRecord preserves value-key mapping types', () => {
  const inverted = Collection.invertRecord({
    draft: 'D',
    published: 'P',
  } as const)

  expectTypeOf(inverted).toEqualTypeOf<{ readonly D: 'draft'; readonly P: 'published' }>()
  expectTypeOf(inverted.D).toEqualTypeOf<'draft'>()
  expectTypeOf(inverted.P).toEqualTypeOf<'published'>()
  expectTypeOf(inverted.D).not.toEqualTypeOf<'published'>()

  // @ts-expect-error "X" is not a valid key
  const unknownKey = inverted.X
  expectTypeOf(unknownKey).toEqualTypeOf<unknown>()
})

test('Collection.invertRecord supports number and symbol value keys', () => {
  const sym = Symbol('active')
  const inverted = Collection.invertRecord({
    first: 1,
    second: sym,
  } as const)

  expectTypeOf(inverted[1]).toEqualTypeOf<'first'>()
  expectTypeOf(inverted[sym]).toEqualTypeOf<'second'>()
})
