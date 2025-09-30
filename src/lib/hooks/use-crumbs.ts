import { isMatch, useMatches } from '@tanstack/react-router'
import type { FileRoutesByTo } from '@/routeTree.gen'

export type Crumb = {
  title: string
  to?: keyof FileRoutesByTo
  params?: Record<string, any>
}

export function crumbs(...crumbs: (Crumb | null | undefined | boolean)[]) {
  return crumbs.filter(Boolean)
}

export function useCrumbs() {
  return useMatches()
    .filter((match) => isMatch(match, 'loaderData.crumbs'))
    .map((match) => match.loaderData?.crumbs)
    .filter((match) => match?.length)
    .flat() as Crumb[]
}
