import { mock } from 'bun:test'

let currentSession: any = null

export function setAuthSession(next: any) {
  currentSession = next
}

mock.module('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: async (_args: any) => currentSession,
    },
  },
}))
