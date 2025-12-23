export async function adminApiGuard(args: {
  headers: Headers
  getSession: (headers: Headers) => Promise<{ user: { role: string } } | null>
  next: (opts?: { context?: { user?: any } }) => any
}): Promise<any> {
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
  next: () => any
  deny: (message: string, status: number) => any
}): Promise<any> {
  if (args.user?.role !== 'admin') {
    return args.deny('Admin access required', 403)
  }
  return await args.next()
}
