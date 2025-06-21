import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { env } from '@/lib/env/server'
import { validate } from '@/lib/utils/validate'

const key = 'sidebar'

const SidebarStateSchema = z.enum(['open', 'closed'])
export type SidebarState = z.infer<typeof SidebarStateSchema>

export const $getSidebarState = createServerFn({ method: 'GET' }).handler(
  () => {
    const sidebarState = getCookie(key) as SidebarState | undefined
    if (sidebarState) return sidebarState
    setCookie(key, 'open', {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
    })
    return 'open'
  },
)

export const $setSidebarState = createServerFn({ method: 'POST' })
  .validator(validate(SidebarStateSchema))
  .handler(async ({ data }) => {
    setCookie(key, data, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
    })
  })
