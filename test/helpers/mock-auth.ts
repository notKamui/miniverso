import { vi } from 'vitest'

let currentSession: any = null

export function setAuthSession(next: any) {
  currentSession = next
}

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      // oxlint-disable-next-line typescript/no-unsafe-return
      getSession: (_args: any) => currentSession,
    },
  },
}))
