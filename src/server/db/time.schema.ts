import type { InferSelectModel } from 'drizzle-orm'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { Time } from '@/lib/utils/time'
import { user } from '@/server/db/auth.schema'

export const timeEntriesTable = pgTable('time_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  startedAt: Time.column('started_at')
    .$defaultFn(() => /* @__PURE__ */ Time.now())
    .notNull(),
  endedAt: Time.column('ended_at'),
  description: text('description'),
})
export type TimeEntry = InferSelectModel<typeof timeEntriesTable>
