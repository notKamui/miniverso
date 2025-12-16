import { createServerOnlyFn } from '@tanstack/react-start'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from '@/lib/env/server'
import { buildObject } from '@/lib/utils/build-object'
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '@/lib/utils/email'
import { db } from '@/server/db'
import * as authSchema from '@/server/db/schema/auth'

export const auth = createServerOnlyFn(() =>
  betterAuth({
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    user: {
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
    experimental: {
      joins: true,
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
      ...(env.HCAPTCHA_SECRET && env.HCAPTCHA_SITEKEY
        ? [
            captcha({
              provider: 'hcaptcha',
              secretKey: env.HCAPTCHA_SECRET,
            }),
          ]
        : []),
      tanstackStartCookies(), // INFO: should be the last plugin
    ],
  }),
)()
