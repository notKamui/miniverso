import { type InferSelectModel, relations } from 'drizzle-orm'
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { Time } from '@/lib/utils/time'
import { user } from '@/server/db/schema/auth'

export const timeEntry = pgTable(
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
export type TimeEntry = InferSelectModel<typeof timeEntry>

export const userRelations_timeEntry = relations(user, ({ many }) => ({
  timeEntries: many(timeEntry),
}))

export const timeEntryRelations = relations(timeEntry, ({ one }) => ({
  user: one(user, {
    fields: [timeEntry.userId],
    references: [user.id],
  }),
}))
