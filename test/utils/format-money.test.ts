import { describe, expect, it } from 'bun:test'
import { formatMoney, getCurrencySymbol } from '@/lib/utils/format-money'

describe('getCurrencySymbol', () => {
  it('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€')
  })

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$')
  })

  it('returns £ for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£')
  })

  it('returns Fr. for CHF', () => {
    expect(getCurrencySymbol('CHF')).toBe('Fr.')
  })

  it('returns the currency code as-is for unknown codes', () => {
    expect(getCurrencySymbol('JPY')).toBe('JPY')
    expect(getCurrencySymbol('CAD')).toBe('CAD')
    expect(getCurrencySymbol('')).toBe('')
  })
})

describe('formatMoney', () => {
  it('formats amount with two decimals and currency symbol for EUR', () => {
    expect(formatMoney(10, 'EUR')).toBe('10.00 €')
    expect(formatMoney(0, 'EUR')).toBe('0.00 €')
    expect(formatMoney(1234.5, 'EUR')).toBe('1234.50 €')
  })

  it('formats amount for USD, GBP, CHF', () => {
    expect(formatMoney(99.99, 'USD')).toBe('99.99 $')
    expect(formatMoney(42, 'GBP')).toBe('42.00 £')
    expect(formatMoney(1.5, 'CHF')).toBe('1.50 Fr.')
  })

  it('uses unknown currency code as symbol when not in the map', () => {
    expect(formatMoney(100, 'JPY')).toBe('100.00 JPY')
  })

  it('coerces numeric-like values via Number()', () => {
    expect(formatMoney(10.1, 'EUR')).toBe('10.10 €')
    // Number(10.126).toFixed(2) => '10.13'
    expect(formatMoney(10.126, 'EUR')).toBe('10.13 €')
  })
})
