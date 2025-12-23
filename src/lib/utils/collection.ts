export namespace Collection {
  export function unique<T>(array: T[]): T[] {
    return Array.from(new Set(array))
  }

  export function partition<T>(
    array: T[],
    predicate: (value: T) => boolean,
  ): [T[], T[]] {
    const truthy: T[] = []
    const falsy: T[] = []
    for (const value of array) {
      if (predicate(value)) truthy.push(value)
      else falsy.push(value)
    }
    return [truthy, falsy]
  }

  export function associateBy<T, K extends PropertyKey>(
    array: T[],
    keySelector: (value: T) => K,
  ): Record<K, T> {
    const result = {} as Record<K, T>
    for (const value of array) {
      result[keySelector(value)] = value
    }
    return result
  }

  export function groupBy<T, K extends PropertyKey>(
    array: T[],
    keySelector: (value: T) => K,
  ): Record<K, T[]> {
    const result = {} as Record<K, T[]>
    for (const value of array) {
      const key = keySelector(value)
      if (!result[key]) {
        result[key] = []
      }
      result[key].push(value)
    }
    return result
  }

  export function range(first: number, lastExcluded: number): number[] {
    if (lastExcluded < first) {
      throw new Error('lastExcluded must be greater than first')
    }
    return Array.from(Array(lastExcluded - first), (_, i) => i + first)
  }

  export function notNullish<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined
  }

  export function notFalsy<T>(
    value: T | false | 0 | '' | null | undefined,
  ): value is T {
    return Boolean(value)
  }

  export function createFactory<T>(): (
    ...items: (T | null | undefined | false)[]
  ) => T[] {
    return (...items: (T | null | undefined | false)[]) => {
      return items.filter(notFalsy)
    }
  }
}
