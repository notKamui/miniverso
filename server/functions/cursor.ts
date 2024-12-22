import { createServerFn } from '@tanstack/start'
import { getCookie } from 'vinxi/http'

export const $getCursor = createServerFn({ method: 'GET' }).handler(
  async () => {
    const cursor = getCookie('cursor-position')
    return cursor ? (JSON.parse(cursor) as { x: number; y: number }) : null
  },
)
