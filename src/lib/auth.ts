import { passkey } from '@better-auth/passkey'
import { createServerOnlyFn } from '@tanstack/react-start'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha, magicLink, multiSession } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from '@/lib/env/server'
import {
  sendMagicLinkEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/lib/utils/email'
import { db } from '@/server/db'
import * as authSchema from '@/server/db/schema/auth'
import { Collection } from './utils/collection'

export const auth = createServerOnlyFn(() =>
  betterAuth({
    rateLimit: {
      enabled: !env.DISABLE_RATE_LIMIT,
    },
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    user: {
      deleteUser: {
        enabled: true,
      },
      additionalFields: {
        role: {
          fieldName: 'role',
          type: 'string',
          defaultValue: 'user',
          required: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (env.ADMIN_EMAILS.includes(user.email)) {
              return { data: { ...user, role: 'admin' } }
            }
            return { data: user }
          },
        },
      },
    },
    advanced: {
      database: {
        joins: true,
      },
    },
    baseURL: env.BASE_URL,
    emailAndPassword: {
      enabled: Boolean(env.RESEND_API_KEY && env.RESEND_MAIL_DOMAIN),
      sendResetPassword: async ({ user, url }) => {
        const response = await sendResetPasswordEmail({
          to: user.email,
          url,
          name: user.name,
          imageUrl: user.image ?? undefined,
        })
        if (response.error) {
          console.error('Error sending reset password email:', response.error, response.data)
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
          console.error('Error sending verification email:', response.error, response.data)
        }
      },
    },
    socialProviders: Collection.buildObject(
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
          enabled: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
        },
      },
    ),
    plugins: Collection.buildArray(
      env.TURNSTILE_SECRET &&
        env.TURNSTILE_SITEKEY &&
        captcha({ provider: 'cloudflare-turnstile', secretKey: env.TURNSTILE_SECRET }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const response = await sendMagicLinkEmail({ to: email, url })
          if (response.error) {
            console.error('Error sending magic link email:', response.error, response.data)
          }
        },
      }),
      multiSession(),
      passkey(),
      tanstackStartCookies(),
    ),
  }),
)()
