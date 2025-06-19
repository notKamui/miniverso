import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

type SignInOptions =
  | {
      type: 'github'
    }
  | {
      type: 'email'
      email: string
      password: string
    }

export function signIn(options: SignInOptions) {
  if (options.type === 'email') {
    return authClient.signIn.email({
      email: options.email,
      password: options.password,
    })
  }

  return authClient.signIn.social({
    provider: options.type,
  })
}
