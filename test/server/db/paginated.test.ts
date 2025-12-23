import { describe, expect, it } from 'bun:test'
import { paginated } from '@/server/db/utils'

// Install shared server DB mock and use its transaction injection hook.
const dbMock = await import('@/../test/helpers/mock-server-db')

function makeFakeDb(args: { total: number; rows: any[] }) {
  const calls = {
    totalSelect: 0,
    subquerySelect: 0,
    rowsSelect: 0,
    subqueryAlias: '' as string,
    subqueryLimit: -1,
    subqueryOffset: -1,
    subqueryOrderBy: undefined as any,
    rowsOrderBy: undefined as any,
    rowsSelectShape: undefined as any,
    innerJoinSubqueryAlias: '' as string,
  }

  const tx = {
    select: (shape: any) => {
      if (shape && 'total' in shape) {
        calls.totalSelect++
        return {
          from: (_table: any) => ({
            where: (_where: any) => ({
              execute: async () => [{ total: args.total }],
            }),
          }),
        }
      }

      if (shape && 'id' in shape) {
        calls.subquerySelect++
        return {
          from: (_table: any) => ({
            where: (_where: any) => ({
              orderBy: (orderBy: any) => {
                calls.subqueryOrderBy = orderBy
                return {
                  limit: (n: number) => {
                    calls.subqueryLimit = n
                    return {
                      offset: (n2: number) => {
                        calls.subqueryOffset = n2
                        return {
                          as: (alias: string) => {
                            calls.subqueryAlias = alias
                            return { id: 'subquery.id', __alias: alias }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }),
          }),
        }
      }

      if (shape && 'row' in shape) {
        calls.rowsSelect++
        calls.rowsSelectShape = shape
        return {
          from: (_table: any) => ({
            innerJoin: (subq: any, _on: any) => {
              calls.innerJoinSubqueryAlias = subq?.__alias
              return {
                orderBy: (orderBy: any) => {
                  calls.rowsOrderBy = orderBy
                  return {
                    execute: async () => args.rows.map((r) => ({ row: r })),
                  }
                },
              }
            },
          }),
        }
      }

      throw new Error('Unexpected select shape')
    },
  }

  return {
    transaction: async (fn: any) => fn(tx),
    __calls: calls,
  }
}

describe('paginated', () => {
  it('handles empty results (totalPages is at least 1)', async () => {
    dbMock.configureTransactionDb(makeFakeDb({ total: 0, rows: [] }))
    const table = { id: 'id-col' } as any
    const res = await paginated({
      table,
      where: undefined,
      orderBy: 'order-col' as any,
      page: 1,
      size: 10,
    })

    expect(res.total).toBe(0)
    expect(res.items).toEqual([])
    expect(res.totalPages).toBe(1)
  })

  it('computes single-page totals correctly', async () => {
    dbMock.configureTransactionDb(
      makeFakeDb({
        total: 3,
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      }),
    )
    const table = { id: 'id-col' } as any
    const res = await paginated({
      table,
      where: 'where' as any,
      orderBy: 'order-col' as any,
      page: 1,
      size: 10,
    })
    expect(res.total).toBe(3)
    expect(res.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(res.totalPages).toBe(1)
  })

  it('computes multi-page totals correctly', async () => {
    dbMock.configureTransactionDb(makeFakeDb({ total: 25, rows: [{ id: 1 }] }))
    const table = { id: 'id-col' } as any
    const res = await paginated({
      table,
      where: 'where' as any,
      orderBy: 'order-col' as any,
      page: 1,
      size: 10,
    })
    expect(res.totalPages).toBe(3)
  })

  it('uses subquery limit/offset and maps rows via { row: table } selection', async () => {
    const txDb = makeFakeDb({ total: 100, rows: [{ id: 'a' }, { id: 'b' }] })
    dbMock.configureTransactionDb(txDb)
    const table = { id: 'id-col' } as any
    const orderBy = { __order: true } as any

    const res = await paginated({
      table,
      where: 'where' as any,
      orderBy,
      page: 2,
      size: 10,
    })

    expect(res.items).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(txDb.__calls.subqueryAlias).toBe('subquery')
    expect(txDb.__calls.innerJoinSubqueryAlias).toBe('subquery')
    expect(txDb.__calls.subqueryLimit).toBe(10)
    expect(txDb.__calls.subqueryOffset).toBe(10)
    expect(txDb.__calls.subqueryOrderBy).toBe(orderBy)
    expect(txDb.__calls.rowsOrderBy).toBe(orderBy)
    expect(txDb.__calls.rowsSelectShape).toEqual({ row: table })
  })
})
