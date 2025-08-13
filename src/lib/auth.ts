import { serverOnly } from '@tanstack/react-start'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { reactStartCookies } from 'better-auth/react-start'
import { env } from '@/lib/env/server'
import { buildObject } from '@/lib/utils/build-object'
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/lib/utils/email'
import { db } from '@/server/db'
import * as schema from '@/server/db/schema'

export const auth = serverOnly(() =>
  betterAuth({
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    baseURL: env.BASE_URL,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        const response = await sendResetPasswordEmail({
          to: user.email,
          url,
          name: user.name,
          imageUrl: user.image ?? undefined,
        })
        if (response.error) {
          console.error(
            'Error sending reset password email:',
            response.error,
            response.data,
          )
        }
      },
      requireEmailVerification: true,
    },
    emailVerification: {
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        const response = await sendVerificationEmail({
          to: user.email,
          url,
          name: user.name,
          imageUrl: user.image ?? undefined,
        })
        if (response.error) {
          console.error(
            'Error sending verification email:',
            response.error,
            response.data,
          )
        }
      },
    },
    socialProviders: buildObject(
      Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET) && {
        github: {
          clientId: env.GITHUB_OAUTH_CLIENT_ID,
          clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
          enabled: true,
        },
      },
      Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) && {
        google: {
          clientId: env.GOOGLE_OAUTH_CLIENT_ID,
          clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
          enabled: Boolean(
            env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
          ),
        },
      },
    ),
    plugins: [
      reactStartCookies(), // WARN: should be the last plugin
    ],
  }),
)()
