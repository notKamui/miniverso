import { isMatch, useMatches } from '@tanstack/react-router'

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
