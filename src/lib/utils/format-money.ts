export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'EUR': {
      return '€'
    }
    case 'USD': {
      return '$'
    }
    case 'GBP': {
      return '£'
    }
    case 'CHF': {
      return 'Fr.'
    }
    default: {
      return currency
    }
  }
}

export function formatMoney(amount: number, currency: string): string {
  return `${Number(amount).toFixed(2)} ${getCurrencySymbol(currency)}`
}
