import { auth } from '@/lib/auth'
import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
  GET: async ({ request }) => {
    await auth.handler(request)
  },
  POST: async ({ request }) => {
    await auth.handler(request)
  },
})
