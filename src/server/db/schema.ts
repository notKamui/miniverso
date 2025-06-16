import { user } from '@/server/db/auth.schema'
import type { InferSelectModel } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export * from '@/server/db/auth.schema'

export const timeEntriesTable = pgTable('time_entry', {
  id: text('id').primaryKey(),
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
