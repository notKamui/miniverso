import { describe, expect, it } from 'bun:test'
import { adminFnGuard } from '@/server/middlewares/admin-guards'

describe('$$admin', () => {
  it('denies when user is missing', async () => {
    const err = await (async () => {
      try {
        await adminFnGuard({
          user: undefined,
          next: () => new Response('ok') as any,
          deny: (message, status) => {
            throw new Error(`${status}:${message}`)
          },
        })
        return null
      } catch (e) {
        return e as Error
      }
    })()

    expect(err).toBeTruthy()
    expect(err?.message).toBe('403:Admin access required')
  })

  it('denies when user is not admin', async () => {
    let nextCalled = false

    expect(
      adminFnGuard({
        user: { role: 'user' },
        next: () => {
          nextCalled = true
          return new Response('ok') as any
        },
        deny: (message, status) => {
          throw new Error(`${status}:${message}`)
        },
      }),
    ).rejects.toThrow('403:Admin access required')

    expect(nextCalled).toBe(false)
  })

  it('allows when user is admin', async () => {
    const res = await adminFnGuard({
      user: { role: 'admin' },
      next: () => new Response('ok', { status: 200 }) as any,
      deny: () => new Response('nope', { status: 403 }),
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
