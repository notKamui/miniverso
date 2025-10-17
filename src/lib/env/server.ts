import { createEnv } from '@t3-oss/env-core'
import * as z from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    BASE_URL: z.url(),
    PORT: z
      .string()
      .default('3000')
      .transform((s) => Number.parseInt(s, 10)),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_MAIL_DOMAIN: z.string().min(1).optional(),
    HCAPTCHA_SITEKEY: z.string().min(1),
    HCAPTCHA_SECRET: z.string().min(1),
    DISABLE_CORS: z
      .string()
      .default('false')
      .transform((s) => s !== 'false' && s !== '0'),
    DISABLE_RATE_LIMIT: z
      .string()
      .default('false')
      .transform((s) => s !== 'false' && s !== '0'),
  },
  extends: [],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.BUILD_ENV === 'production',
  createFinalSchema: (shape, _isServer) =>
    z.object(shape).transform((env, ctx) => {
      const socials = {
        emailAndPassword: Boolean(env.RESEND_API_KEY && env.RESEND_MAIL_DOMAIN),
        github: Boolean(
          env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET,
        ),
        google: Boolean(
          env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET,
        ),
      }
      if (!socials.emailAndPassword && !socials.github && !socials.google) {
        ctx.addIssue({
          code: 'custom',
          message:
            'At least one social OAuth provider or email/password must be configured',
        })
        return z.NEVER
      }
      return env
    }),
})
