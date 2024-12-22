export namespace Collection {
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
    const result: Record<K, T> = {} as any
    for (const value of array) {
      result[keySelector(value)] = value
    }
    return result
  }
}
