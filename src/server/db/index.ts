import { createServerOnlyFn } from '@tanstack/react-start'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/lib/env/server'
import * as schema from '@/server/db/schema'

const initDB = createServerOnlyFn(() => {
  const postgresClient = postgres(env.DATABASE_URL)
  return drizzle({ client: postgresClient, schema })
})

export const db = initDB()

export const takeUniqueOrNull = takeUniqueOr(() => null) as <T extends any[]>(
  values: T,
) => T[number] | null

export function takeUniqueOr<
  T extends any[],
  E extends T[number] | null | undefined = never,
>(or: () => E): (values: T) => [E] extends [never] ? T[number] : E | T[number] {
  return (values) => {
    if (values.length === 0) return or()
    return values[0]
  }
}
