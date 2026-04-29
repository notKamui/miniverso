import { Compute } from './types'

export namespace Collection {
  type MergeRecordsByKeysInput = Record<string, Record<PropertyKey, unknown>>

  type InnerKeys<T extends MergeRecordsByKeysInput> = {
    [P in keyof T]: keyof T[P]
  }[keyof T]

  type MergeRecordsByKeysOutput<T extends MergeRecordsByKeysInput> = {
    [K in InnerKeys<T>]: {
      [P in keyof T]: K extends keyof T[P] ? T[P][K] | undefined : undefined
    }
  }

  export function mergeRecordsByKeys<T extends MergeRecordsByKeysInput>(
    sources: T,
  ): MergeRecordsByKeysOutput<T> {
    const mergedKeys = new Set<PropertyKey>()
    for (const record of Object.values(sources)) {
      for (const key of Object.keys(record)) {
        mergedKeys.add(key)
      }
    }

    const result: Record<PropertyKey, Record<string, unknown>> = {}

    for (const key of mergedKeys) {
      const merged: Record<string, unknown> = {}
      for (const [sourceName, record] of Object.entries(sources)) {
        merged[sourceName] = record[key]
      }
      result[key] = merged
    }

    return result as MergeRecordsByKeysOutput<T>
  }

  export function unique<T>(array: T[]): T[] {
    return [...new Set(array)]
  }

  export function partition<T>(array: T[], predicate: (value: T) => boolean): [T[], T[]] {
    const truthy: T[] = []
    const falsy: T[] = []
    for (let i = 0; i < array.length; i++) {
      if (!(i in array)) continue
      const value = array[i]
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
    for (let i = 0; i < array.length; i++) {
      if (!(i in array)) continue
      const value = array[i]
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
    return Array.from({ length: lastExcluded - first }, (_, i) => i + first)
  }

  type InvertRecordOutput<T extends Record<PropertyKey, PropertyKey>> = {
    [K in keyof T as T[K]]: K
  }

  export function invertRecord<T extends Record<PropertyKey, PropertyKey>>(
    record: T,
  ): Compute<InvertRecordOutput<T>> {
    const result: Record<PropertyKey, keyof T> = {}

    for (const key of Reflect.ownKeys(record) as (keyof T)[]) {
      const value = record[key]
      result[value] = key
    }

    return result as unknown as InvertRecordOutput<T>
  }

  export function notNullish<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined
  }

  // oxlint-disable-next-line unicorn/prefer-native-coercion-functions
  export function notFalsy<T>(value: T | false | 0 | '' | null | undefined): value is T {
    return Boolean(value)
  }

  export function createFactory<T>(): (...items: (T | null | undefined | false)[]) => T[] {
    return (...items: (T | null | undefined | false)[]) => {
      return items.filter(notFalsy)
    }
  }
}
