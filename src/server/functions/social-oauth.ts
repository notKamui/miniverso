import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env/server'

export const socialOAuthQueryKey = ['socialOAuth'] as const

export function socialOAuthQueryOptions() {
  return queryOptions({
    queryKey: socialOAuthQueryKey,
    queryFn: $getSocialOAuth,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export const $getSocialOAuth = createServerFn({ method: 'GET' }).handler(() => {
  return {
    github: Boolean(
      env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET,
    ),
    google: Boolean(
      env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
  }
})
