import type { FileRoutesByTo } from '@/routeTree.gen'
import { isMatch, useMatches } from '@tanstack/react-router'

export type Crumb = {
  title: string
  to?: keyof FileRoutesByTo
}

export function crumbs(...crumbs: Crumb[]) {
  return crumbs
}

export function useCrumbs() {
  return useMatches()
    .filter((match) => isMatch(match, 'loaderData.crumbs'))
    .map((match) => match.loaderData?.crumbs)
    .filter((match) => match?.length)
    .flat() as Crumb[]
}
