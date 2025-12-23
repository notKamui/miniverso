import { describe, expect, it } from 'bun:test'
import { adminApiGuard } from '@/server/middlewares/admin-guards'

describe('$$adminApi', () => {
  it('returns 401 when session is missing', async () => {
    const res = await adminApiGuard({
      headers: new Headers({}),
      getSession: async () => null,
      next: () => new Response('ok'),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when user is not admin', async () => {
    const res = await adminApiGuard({
      headers: new Headers({ cookie: 'x=y' }),
      getSession: async () => ({ user: { role: 'user' } }),
      next: () => new Response('ok'),
    })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Admin access required' })
  })

  it('calls next with user context when admin', async () => {
    const session = { user: { role: 'admin', email: 'admin@example.com' } }

    let ctxUser: any = null
    const res = await adminApiGuard({
      headers: new Headers({ cookie: 'x=y' }),
      getSession: async () => session,
      next: (opts?: any) => {
        ctxUser = opts?.context?.user
        return new Response('ok', { status: 200 })
      },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
    expect(ctxUser).toEqual(session.user)
  })
})
