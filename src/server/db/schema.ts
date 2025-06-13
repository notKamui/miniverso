import type { UUID } from '@/lib/utils/uuid'
import type { InferSelectModel } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
  id: uuid().primaryKey().defaultRandom().$type<UUID>(),
  username: varchar({ length: 255 }).unique().notNull(),
})
export type User = InferSelectModel<typeof usersTable>

export const timeEntriesTable = pgTable('time_entries', {
  id: uuid().primaryKey().defaultRandom().$type<UUID>(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' })
    .$type<UUID>(),
  startedAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
  endedAt: timestamp({ withTimezone: true, mode: 'date' }),
  description: text(),
})
export type TimeEntry = InferSelectModel<typeof timeEntriesTable>
