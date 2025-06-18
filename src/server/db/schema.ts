import type { InferSelectModel } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from '@/server/db/auth.schema'

export * from '@/server/db/auth.schema'

export const timeEntriesTable = pgTable('time_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
  description: text('description'),
})
export type TimeEntry = InferSelectModel<typeof timeEntriesTable>
