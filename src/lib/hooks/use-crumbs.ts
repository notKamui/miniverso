import { useMatches } from '@tanstack/react-router'

export type Crumb = {
  to: string
  params?: Record<string, unknown>
  search?: Record<string, unknown>
  name: string
}

function hasCrumb<T extends { loaderData?: unknown }>(
  obj: T,
): obj is T & { loaderData: { crumb: string } } {
  return (
    Boolean(obj.loaderData) &&
    obj.loaderData !== null &&
    typeof obj.loaderData === 'object' &&
    'crumb' in obj.loaderData &&
    Boolean(obj.loaderData.crumb)
  )
}

export function useCrumbs(): Crumb[] {
  return useMatches({
    select: (matches) =>
      matches.filter(hasCrumb).map((match) => ({
        to: match.pathname,
        params: match.params,
        search: match.search,
        name: match.loaderData.crumb,
      })),
  })
}
