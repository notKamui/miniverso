import { createServerOnlyFn } from '@tanstack/react-start'
import { count, eq, type InferSelectModel, type SQL } from 'drizzle-orm'
import type { AnyPgTable, PgColumn } from 'drizzle-orm/pg-core'
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

export async function paginated<
  TTable extends AnyPgTable<{ columns: { id: PgColumn } }>,
>(options: {
  table: TTable
  where: SQL | undefined
  orderBy: PgColumn | SQL | SQL.Aliased
  page: number
  size: number
}): Promise<{
  items: Array<InferSelectModel<TTable>>
  total: number
  size: number
  page: number
  totalPages: number
}> {
  const idColumn = (options.table as any).id as PgColumn

  const [total, items] = await db.transaction(async (tx) => {
    const totalQuery = tx
      .select({ total: count() })
      .from(options.table as AnyPgTable)
      .where(options.where)

    const subquery = db
      .select({ id: idColumn })
      .from(options.table as AnyPgTable)
      .where(options.where)
      .orderBy(options.orderBy)
      .limit(options.size)
      .offset((options.page - 1) * options.size)
      .as('subquery')

    const rowsQuery = await db
      .select({ row: options.table as TTable })
      .from(options.table as AnyPgTable)
      .innerJoin(subquery, eq(idColumn, subquery.id))
      .orderBy(options.orderBy)

    const [[{ total }], rows] = await Promise.all([totalQuery, rowsQuery])

    return [total, rows.map((r) => r.row)]
  })

  return {
    items,
    total,
    size: options.size,
    page: options.page,
    totalPages: Math.max(1, Math.ceil(total / options.size)),
  }
}
