import { describe, expect, it } from 'bun:test'
import {
  priceTaxIncluded,
  productUnitProductionCost,
} from '@/server/functions/inventory/utils'

describe('priceTaxIncluded', () => {
  it('computes price incl. VAT from tax-free price and VAT percent', () => {
    expect(priceTaxIncluded(100, 20)).toBe(120)
    expect(priceTaxIncluded(100, 0)).toBe(100)
    expect(priceTaxIncluded(50, 10)).toBeCloseTo(55, 2)
  })

  it('accepts string inputs and coerces to number', () => {
    expect(priceTaxIncluded('100', '20')).toBe(120)
    expect(priceTaxIncluded(100, '5')).toBe(105)
  })

  it('handles decimal VAT and prices', () => {
    expect(priceTaxIncluded(10.5, 20)).toBe(12.6)
    expect(priceTaxIncluded(99.99, 8.5)).toBeCloseTo(108.49, 2)
  })
})

describe('productUnitProductionCost', () => {
  it('returns 0 for empty rows', () => {
    expect(productUnitProductionCost([])).toBe(0)
  })

  it('sums numeric amounts', () => {
    expect(productUnitProductionCost([{ amount: 10 }, { amount: 5 }])).toBe(15)
    expect(productUnitProductionCost([{ amount: 1.5 }])).toBe(1.5)
  })

  it('accepts string amounts and coerces to number', () => {
    expect(productUnitProductionCost([{ amount: '10' }, { amount: '5' }])).toBe(15)
    expect(productUnitProductionCost([{ amount: '3.14' }])).toBe(3.14)
  })

  it('handles mixed number and string amounts', () => {
    expect(
      productUnitProductionCost([{ amount: 10 }, { amount: '5' }, { amount: 2.5 }]),
    ).toBe(17.5)
  })
})
