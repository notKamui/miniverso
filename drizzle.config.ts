import { defineConfig } from 'drizzle-kit'
import { env } from '@/lib/env/server'

export default defineConfig({
  out: './.drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
