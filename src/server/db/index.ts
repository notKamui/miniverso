import { serverOnly } from '@tanstack/react-start'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../../lib/env/server'

const initDB = serverOnly(() => {
  const postgresClient = postgres(env.DATABASE_URL)
  return drizzle({ client: postgresClient })
})

export const db = initDB()

export function takeUniqueOrNull<T extends any[]>(values: T): T[number] | null {
  return values.length > 0 ? values[0] : null
}

export function takeUniqueOr<T extends any[]>(
  or: () => never,
): (values: T) => T[number] {
  return (values: T): T[number] => {
    if (values.length === 0) or()
    return values[0]
  }
}
