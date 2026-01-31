import type { VisibilityState } from '@tanstack/react-table'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import * as z from 'zod'
import { env } from '@/lib/env/server'
import { tryInline } from '@/lib/utils/try'
import { validate } from '@/lib/utils/validate'

const COOKIE_PREFIX = 'dt-cv-'

function cookieName(key: string) {
  return `${COOKIE_PREFIX}${key}`
}

function parseVisibilityState(raw: unknown): VisibilityState {
  if (typeof raw !== 'object' || raw === null) return {}
  const result: VisibilityState = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'boolean') result[k] = v
  }
  return result
}

export function getColumnVisibilityQueryOptions(key: string) {
  return queryOptions({
    queryKey: ['columnVisibility', key] as const,
    queryFn: () => $getColumnVisibility({ data: { key } }),
    staleTime: 1000 * 60 * 5,
  })
}

const getSchema = z.object({ key: z.string().min(1) })
const setSchema = z.object({
  key: z.string().min(1),
  state: z.record(z.string(), z.boolean()),
})

export const $getColumnVisibility = createServerFn({ method: 'GET' })
  .inputValidator(validate(getSchema))
  .handler(({ data: { key } }) => {
    const raw = getCookie(cookieName(key))
    if (raw == null || raw === '') return {} as VisibilityState
    const [error, result] = tryInline(() => JSON.parse(raw) as unknown)
    if (error) return {} as VisibilityState
    return parseVisibilityState(result)
  })

export const $setColumnVisibility = createServerFn({ method: 'POST' })
  .inputValidator(validate(setSchema))
  .handler(({ data: { key, state } }) => {
    setCookie(cookieName(key), JSON.stringify(state), {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
    })
  })
