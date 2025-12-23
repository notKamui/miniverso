import { mock } from 'bun:test'

type ExportRow = {
  id: string
  startedAt: any
  endedAt: any
  description: any
  userEmail: string
}

type UserRow = { id: string; email: string }

type InsertedTimeEntry = {
  id: string
  userId: string
  startedAt: any
  endedAt: any
  description: string | null
}

let exportPages: ExportRow[][] = []
let exportThrowOnQuery = false
let exportCalls = 0

let usersByEmail = new Map<string, UserRow>()
let timeEntriesById = new Map<string, InsertedTimeEntry>()
let insertCalls: InsertedTimeEntry[][] = []

let transactionDb: any = null

export function configureTransactionDb(next: any) {
  transactionDb = next
}

export function configureExport(next: {
  pages: ExportRow[][]
  throwOnQuery?: boolean
}) {
  exportCalls = 0
  exportPages = next.pages
  exportThrowOnQuery = Boolean(next.throwOnQuery)
}

export function getExportCalls() {
  return exportCalls
}

export function resetImportState(next: {
  users: UserRow[]
  initialTimeEntriesById?: Map<string, InsertedTimeEntry>
}) {
  usersByEmail = new Map(next.users.map((u) => [u.email, u] as const))
  timeEntriesById = next.initialTimeEntriesById ?? new Map()
  insertCalls = []
}

export function getImportState() {
  return { timeEntriesById, insertCalls }
}

function exportQueryBuilder() {
  return {
    orderBy: (_a: any, _b?: any) => ({
      limit: async (_n: number) => {
        if (exportThrowOnQuery) {
          throw new Error('DB should not be called')
        }
        exportCalls++
        return exportPages[exportCalls - 1] ?? []
      },
    }),
  }
}

mock.module('@/server/db', () => ({
  db: {
    select: (_shape: any) => ({
      from: (_table: any) => {
        return {
          innerJoin: (_table2: any, _on: any) => ({
            where: (_where: any) => exportQueryBuilder(),
          }),
          where: async (_where: any) => {
            return Array.from(usersByEmail.values())
          },
        }
      },
    }),
    insert: (_table: any) => ({
      values: (values: any[]) => ({
        onConflictDoUpdate: async (_cfg: any) => {
          insertCalls.push(values as InsertedTimeEntry[])
          for (const v of values as InsertedTimeEntry[]) {
            timeEntriesById.set(v.id, v)
          }
        },
      }),
    }),

    transaction: async (fn: any) => {
      if (!transactionDb) {
        throw new Error('Transaction mock not configured')
      }
      return await transactionDb.transaction(fn)
    },
  },
  buildConflictUpdateColumns: (_table: any, _cols: any[]) => ({}),
}))
