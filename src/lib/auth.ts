import { env } from '@/lib/env/server'
import { db } from '@/server/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { reactStartCookies } from 'better-auth/react-start'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: env.BASE_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
      enabled: true,
    },
  },
  plugins: [
    reactStartCookies(), // WARN: should be the last plugin
  ],
})
