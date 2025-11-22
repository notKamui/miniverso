import { type InferSelectModel, relations } from 'drizzle-orm'
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { Time } from '@/lib/utils/time'
import { user } from '@/server/db/auth.schema'

export const timeEntriesTable = pgTable(
  'time_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startedAt: Time.column('started_at')
      .$defaultFn(() => /* @__PURE__ */ Time.now())
      .notNull(),
    endedAt: Time.column('ended_at'),
    description: text('description'),
  },
  (table) => [index('time_entry_userId_idx').on(table.userId)],
)
export type TimeEntry = InferSelectModel<typeof timeEntriesTable>

export const userRelations = relations(user, ({ many }) => ({
  timeEntries: many(timeEntriesTable),
}))

export const timeEntryRelations = relations(timeEntriesTable, ({ one }) => ({
  user: one(user, {
    fields: [timeEntriesTable.userId],
    references: [user.id],
  }),
}))
