import { useMatches } from '@tanstack/react-router'

export type Crumb = {
  to: string
  params: Record<string, string | number>
  search: Record<string, string | number>
  name: string
}

export function useCrumbs(): Crumb[] {
  return useMatches({
    select: (matches) =>
      matches
        .filter(
          (match): match is typeof match & { loaderData: { crumb: string } } =>
            !!(match.loaderData as any)?.crumb,
        )
        .map((match) => ({
          to: match.pathname,
          params: (match.params as never) || {},
          search: (match.search as never) || {},
          name: match.loaderData.crumb,
        })),
  })
}
