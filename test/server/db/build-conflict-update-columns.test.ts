import { describe, expect, it } from 'bun:test'
import type { BuildQueryConfig } from 'drizzle-orm'
import { timeEntry } from '@/server/db/schema'
import { buildConflictUpdateColumns } from '@/server/db/utils'

describe('buildConflictUpdateColumns', () => {
  it('maps column keys to excluded.<db_column_name> SQL', () => {
    const set = buildConflictUpdateColumns(timeEntry, [
      'startedAt',
      'endedAt',
      'description',
      'userId',
    ])

    const queryConfig = {} as BuildQueryConfig

    expect(set.startedAt.toQuery(queryConfig).sql).toBe('excluded.started_at')
    expect(set.endedAt.toQuery(queryConfig).sql).toBe('excluded.ended_at')
    expect(set.description.toQuery(queryConfig).sql).toBe(
      'excluded.description',
    )
    expect(set.userId.toQuery(queryConfig).sql).toBe('excluded.user_id')
  })
})
