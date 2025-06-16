import { env } from '@/lib/env/server'
import { db } from '@/server/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: env.BASE_URL,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        if (env.NODE_ENV === 'development') {
          console.log(`Magic link for ${email}: ${url}?token=${token}`)
        }
      },
    }),
  ],
})
