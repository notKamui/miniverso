import { serverOnly } from '@tanstack/react-start'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../../lib/env/server'

const initDB = serverOnly(() => {
  const postgresClient = postgres(env.DATABASE_URL)
  return drizzle({ client: postgresClient })
})

export const db = initDB()

export const takeUniqueOrNull = takeUniqueOr(() => null) as <T extends any[]>(
  values: T,
) => T[number] | null

export function takeUniqueOr<
  T extends any[],
  E extends T[number] | null | undefined = never,
>(or: () => E): (values: T) => E extends never ? T[number] : E {
  return (values) => {
    if (values.length === 0) return or()
    return values[0]
  }
}
