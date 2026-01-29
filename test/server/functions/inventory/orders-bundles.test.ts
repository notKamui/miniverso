import { describe, expect, it } from 'bun:test'
import { computeRequiredQuantities } from '@/server/functions/inventory/orders'

describe('computeRequiredQuantities', () => {
  it('returns quantity for simple product only', () => {
    const items = [{ productId: 'p1', quantity: 3 }]
    const productMap = new Map([['p1', { kind: 'simple' as const }]])
    const bundleItemsMap = new Map<string, Array<{ productId: string; quantity: number }>>()
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.size).toBe(1)
    expect(result.get('p1')).toBe(3)
  })

  it('expands bundle into component quantities only', () => {
    const items = [{ productId: 'bundle1', quantity: 2 }]
    const productMap = new Map([['bundle1', { kind: 'bundle' as const }]])
    const bundleItemsMap = new Map([
      [
        'bundle1',
        [
          { productId: 'p1', quantity: 3 },
          { productId: 'p2', quantity: 1 },
        ],
      ],
    ])
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.size).toBe(2)
    expect(result.get('p1')).toBe(6) // 2 bundles * 3
    expect(result.get('p2')).toBe(2) // 2 bundles * 1
  })

  it('does not add bundle product itself to required quantities', () => {
    const items = [{ productId: 'bundle1', quantity: 1 }]
    const productMap = new Map([['bundle1', { kind: 'bundle' as const }]])
    const bundleItemsMap = new Map([['bundle1', [{ productId: 'p1', quantity: 2 }]]])
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.has('bundle1')).toBe(false)
    expect(result.get('p1')).toBe(2)
  })

  it('mixed order: simple + bundle sharing a component adds quantities', () => {
    const items = [
      { productId: 'p1', quantity: 5 },
      { productId: 'bundle1', quantity: 2 },
    ]
    const productMap = new Map([
      ['p1', { kind: 'simple' as const }],
      ['bundle1', { kind: 'bundle' as const }],
    ])
    const bundleItemsMap = new Map([['bundle1', [{ productId: 'p1', quantity: 3 }]]])
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.size).toBe(1)
    expect(result.get('p1')).toBe(5 + 2 * 3) // 5 + 6 = 11
  })

  it('ignores items whose product is not in productMap', () => {
    const items = [{ productId: 'unknown', quantity: 10 }]
    const productMap = new Map<string, { kind: 'simple' | 'bundle' }>()
    const bundleItemsMap = new Map<string, Array<{ productId: string; quantity: number }>>()
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.size).toBe(0)
  })

  it('empty bundle components contribute nothing', () => {
    const items = [{ productId: 'bundle1', quantity: 2 }]
    const productMap = new Map([['bundle1', { kind: 'bundle' as const }]])
    const bundleItemsMap = new Map([['bundle1', []]])
    const result = computeRequiredQuantities(items, productMap, bundleItemsMap)
    expect(result.size).toBe(0)
  })
})
