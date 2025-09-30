import { isMatch, useMatches } from '@tanstack/react-router'
import type { LinkOptions } from '@/lib/utils/types'

export type Crumb = {
  title: string
  link?: LinkOptions
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
