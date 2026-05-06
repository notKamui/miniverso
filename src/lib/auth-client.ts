import { passkeyClient } from '@better-auth/passkey/client'
import { magicLinkClient, multiSessionClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [multiSessionClient(), magicLinkClient(), passkeyClient()],
})

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
