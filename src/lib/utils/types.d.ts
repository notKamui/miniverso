import type { HTMLAttributes, RefObject } from 'react'

export type Compute<T> = { [K in keyof T]: T[K] } & {}

export type Enumerate<
  N extends number,
  Acc extends number[] = [],
> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

export type Range<Min extends number, Max extends number> = Exclude<
  Enumerate<Max>,
  Enumerate<Min>
>

export type WithRef<
  T,
  R extends HTMLElement = T extends HTMLAttributes<infer HR>
    ? HR extends HTMLElement
      ? HR
      : never
    : never,
  Mandatory extends boolean = false,
> = R extends never
  ? never
  : Mandatory extends true
    ? T & { ref: RefObject<R> }
    : T & { ref?: RefObject<R> }

export type PartialExcept<T, K extends keyof T> = Compute<
  Partial<T> & Pick<T, K>
>
