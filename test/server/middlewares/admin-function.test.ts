import { describe, expect, it } from 'bun:test'
import { adminFnGuard } from '@/server/middlewares/admin-guards'

describe('$$admin', () => {
  it('denies when user is missing', async () => {
    const err = await (async () => {
      try {
        await adminFnGuard({
          user: undefined,
          // oxlint-disable-next-line typescript/no-unsafe-return
          next: () => new Response('ok') as any,
          deny: (message, status) => {
            throw new Error(`${status}:${message}`)
          },
        })
        return null
      } catch (error) {
        return error as Error
      }
    })()

    expect(err).toBeTruthy()
    expect(err?.message).toBe('403:Admin access required')
  })

  it('denies when user is not admin', () => {
    let nextCalled = false

    expect(
      adminFnGuard({
        user: { role: 'user' },
        next: () => {
          nextCalled = true
          // oxlint-disable-next-line typescript/no-unsafe-return
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
      // oxlint-disable-next-line typescript/no-unsafe-return
      next: () => new Response('ok', { status: 200 }) as any,
      deny: () => new Response('nope', { status: 403 }),
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
