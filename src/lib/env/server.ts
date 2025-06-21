import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    BASE_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    GITHUB_OAUTH_CLIENT_ID: z.string().min(1),
    GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_MAIL_DOMAIN: z.string().min(1),
    DISABLE_CSRF: z
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
})
