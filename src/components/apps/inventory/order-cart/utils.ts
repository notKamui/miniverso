import type { CartItem, PriceModification, Preset } from './types'

export function effectivePriceTaxFree(item: CartItem): number {
  return item.unitPriceTaxFree ?? item.priceTaxFree
}

export function applyModificationToPrice(basePrice: number, mod: PriceModification): number {
  const v = mod.value
  let result: number
  if (mod.type === 'increase') {
    result = mod.kind === 'flat' ? basePrice + v : basePrice * (1 + v / 100)
  } else {
    result = mod.kind === 'flat' ? Math.max(0, basePrice - v) : basePrice * (1 - v / 100)
    result = Math.max(0, result)
  }
  return Number(result.toFixed(2))
}

export function presetToModification(p: Preset): PriceModification {
  return {
    type: p.type,
    kind: p.kind,
    value: Number(p.value),
  }
}

export function presetLabel(p: Preset): string {
  const v = Number(p.value)
  const suffix = p.kind === 'relative' ? `%` : ''
  const sign = p.type === 'increase' ? '+' : '−'
  return `${p.name} (${sign}${v}${suffix})`
}
