import { describe, expect, it } from 'bun:test'
import { productFormSchema } from '@/lib/forms/product'

const baseInput = {
  name: 'Test',
  sku: 'SKU-1',
  priceTaxFree: 10,
  vatPercent: 20,
  quantity: 0,
  tagIds: [],
  productionCosts: [],
}

describe('productFormSchema bundle validation', () => {
  it('accepts simple product with no bundleItems', () => {
    const result = productFormSchema.safeParse({
      ...baseInput,
      kind: 'simple',
      bundleItems: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects bundle with empty bundleItems', () => {
    const result = productFormSchema.safeParse({
      ...baseInput,
      kind: 'bundle',
      bundleItems: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const bundleItemsIssue = result.error.issues.find(
        (i) => i.path.join('.') === 'bundleItems' || i.path[0] === 'bundleItems',
      )
      expect(bundleItemsIssue?.message).toContain('at least one component')
    }
  })

  it('accepts bundle with at least one bundleItem', () => {
    const productId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const result = productFormSchema.safeParse({
      ...baseInput,
      kind: 'bundle',
      bundleItems: [{ productId, quantity: 2 }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bundleItems).toHaveLength(1)
      expect(result.data.bundleItems[0].productId).toBe(productId)
      expect(result.data.bundleItems[0].quantity).toBe(2)
    }
  })
})
