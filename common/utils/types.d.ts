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
