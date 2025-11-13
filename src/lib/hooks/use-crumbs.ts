import { isMatch, useMatches } from '@tanstack/react-router'
import { Collection } from '@/lib/utils/collection'

export type Crumb = {
  title: string
  link?: {
    to: string
    params?: any
    search?: any
    hash?: any
    state?: any
    from?: string
  }
}

export const crumbs = Collection.createFactory<Crumb>()

export function useCrumbs(): Crumb[] {
  return useMatches()
    .filter((match) => isMatch(match, 'loaderData.crumbs'))
    .map((match) => match.loaderData?.crumbs)
    .filter((match) => match?.length)
    .filter(Collection.notNullish)
    .flat()
}
