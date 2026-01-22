import type {
  FunctionMiddlewareAfterServer,
  FunctionMiddlewareServerNextFn,
  RequestServerNextFn,
} from '@tanstack/react-start'

export async function adminApiGuard(args: {
  headers: Headers
  getSession: (headers: Headers) => Promise<{ user: { role: string } } | null>
  next: RequestServerNextFn<Record<string, unknown>, undefined>
}) {
  const session = await args.getSession(args.headers)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (session.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return await args.next({ context: { user: session.user } })
}

export async function adminFnGuard(args: {
  user: { role?: string } | null | undefined
  next: FunctionMiddlewareServerNextFn<
    Record<string, unknown>,
    readonly [
      FunctionMiddlewareAfterServer<
        Record<string, unknown>,
        unknown,
        undefined,
        {
          user: {
            id: string
            createdAt: Date
            updatedAt: Date
            email: string
            emailVerified: boolean
            name: string
            image?: string | null | undefined
            role: string
          }
        },
        undefined,
        undefined,
        undefined
      >,
    ],
    undefined
  >
  deny: (message: string, status: number) => any
}): Promise<any> {
  if (args.user?.role !== 'admin') {
    return args.deny('Admin access required', 403)
  }
  return await args.next()
}
