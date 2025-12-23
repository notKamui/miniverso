import { createServerOnlyFn } from '@tanstack/react-start'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/lib/env/server'
import * as schema from '@/server/db/schema'

export const db = createServerOnlyFn(() => {
  const postgresClient = postgres(env.DATABASE_URL)
  return drizzle({ client: postgresClient, schema })
})()

export * from './utils'
