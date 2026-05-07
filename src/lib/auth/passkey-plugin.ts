import { createAuthPlugin } from '@better-auth-ui/core'
import {
  passkeyPlugin as corePasskeyPlugin,
  type PasskeyPluginOptions,
} from '@better-auth-ui/core/plugins'
import { PasskeyButton } from '@/components/auth/passkey-button'
import { Passkeys } from '@/components/auth/settings/security/passkeys'

export const passkeyPlugin = createAuthPlugin(
  corePasskeyPlugin.id,
  (options: PasskeyPluginOptions = {}) => ({
    ...corePasskeyPlugin(options),
    authButtons: [PasskeyButton],
    securityCards: [Passkeys],
  }),
)
