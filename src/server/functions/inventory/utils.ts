export function priceTaxIncluded(
  priceTaxFree: number | string,
  vatPercent: number | string,
): number {
  const p = typeof priceTaxFree === 'string' ? Number(priceTaxFree) : priceTaxFree
  const v = typeof vatPercent === 'string' ? Number(vatPercent) : vatPercent
  return p * (1 + v / 100)
}

export function productUnitProductionCost(rows: { amount: number | string }[]): number {
  return rows.reduce(
    (sum, r) => sum + (typeof r.amount === 'string' ? Number(r.amount) : r.amount),
    0,
  )
}
