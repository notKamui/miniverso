import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env/server'

export const captchaInfoQueryKey = ['captchaInfo'] as const

export function captchaInfoQueryOptions() {
  return queryOptions({
    queryKey: captchaInfoQueryKey,
    queryFn: ({ signal }) => $getCaptchaInfo({ signal }),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export const $getCaptchaInfo = createServerFn({ method: 'GET' }).handler(() => {
  return {
    siteKey: env.TURNSTILE_SITEKEY,
  }
})
