import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env/server'

export const hcaptchaInfoQueryKey = ['hcaptchaInfo'] as const

export function hcaptchaInfoQueryOptions() {
  return queryOptions({
    queryKey: hcaptchaInfoQueryKey,
    queryFn: ({ signal }) => $getHcaptchaInfo({ signal }),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export const $getHcaptchaInfo = createServerFn({ method: 'GET' }).handler(
  () => {
    return {
      siteKey: env.HCAPTCHA_SITEKEY,
    }
  },
)
