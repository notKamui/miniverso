import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { z } from 'zod'
import { env } from '@/lib/env/server'
import { validate } from '@/lib/utils/validate'

const key = 'theme'

const ThemeSchema = z.enum(['system', 'light', 'dark'])
export type Theme = Exclude<z.infer<typeof ThemeSchema>, 'system'>

export const $getTheme = createServerFn({ method: 'GET' }).handler(() => {
  const theme = getCookie(key) as Theme | undefined
  return theme ?? null
})

export const $setTheme = createServerFn({ method: 'POST' })
  .inputValidator(validate(ThemeSchema))
  .handler(async ({ data }) => {
    if (data === 'system') {
      deleteCookie(key)
      return
    }
    setCookie(key, data, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
    })
  })
