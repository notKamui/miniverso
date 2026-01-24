import { mock } from 'bun:test'

let currentSession: any = null

export function setAuthSession(next: any) {
  currentSession = next
}

await mock.module('@/lib/auth', () => ({
  auth: {
    api: {
      // oxlint-disable-next-line typescript/no-unsafe-return
      getSession: (_args: any) => currentSession,
    },
  },
}))
