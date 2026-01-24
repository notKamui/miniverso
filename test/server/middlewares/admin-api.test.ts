import { describe, expect, it } from 'bun:test'
import { adminApiGuard } from '@/server/middlewares/admin-guards'

describe('$$adminApi', () => {
  it('returns 401 when session is missing', async () => {
    const res: any = await adminApiGuard({
      headers: new Headers({}),
      getSession: () => Promise.resolve(null),
      // oxlint-disable-next-line typescript/no-unsafe-return
      next: () => new Response('ok') as any,
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when user is not admin', async () => {
    const res: any = await adminApiGuard({
      headers: new Headers({ cookie: 'x=y' }),
      getSession: () => Promise.resolve({ user: { role: 'user' } }),
      // oxlint-disable-next-line typescript/no-unsafe-return
      next: () => new Response('ok') as any,
    })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Admin access required' })
  })

  it('calls next with user context when admin', async () => {
    const session = { user: { role: 'admin', email: 'admin@example.com' } }

    let ctxUser: any = null
    const res: any = await adminApiGuard({
      headers: new Headers({ cookie: 'x=y' }),
      getSession: () => Promise.resolve(session),
      next: (opts?: any) => {
        ctxUser = opts?.context?.user
        // oxlint-disable-next-line typescript/no-unsafe-return
        return new Response('ok', { status: 200 }) as any
      },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
    expect(ctxUser).toEqual(session.user)
  })
})
