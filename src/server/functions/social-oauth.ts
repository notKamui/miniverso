import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env/server'

export const socialOAuthQueryKey = ['socialOAuth'] as const

export function socialOAuthQueryOptions() {
  return queryOptions({
    queryKey: socialOAuthQueryKey,
    queryFn: ({ signal }) => $getSocialOAuth({ signal }),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export const $getSocialOAuth = createServerFn({ method: 'GET' }).handler(() => {
  return {
    emailAndPassword: Boolean(env.RESEND_API_KEY && env.RESEND_MAIL_DOMAIN),
    github: Boolean(
      env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET,
    ),
    google: Boolean(
      env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
  }
})
