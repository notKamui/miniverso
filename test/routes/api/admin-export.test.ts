import { describe, expect, it, mock } from 'bun:test'
import { Time } from '@/lib/utils/time'

// Install shared mocks once.
await import('@/../test/helpers/mock-auth')
const dbMock = await import('@/../test/helpers/mock-server-db')

const exportedRows = Array.from({ length: 3 }, (_, i) => {
  const startedAt = Time.from(`2020-01-01T00:00:0${i}Z`)
  return {
    id: `id-${i}`,
    startedAt,
    endedAt: i === 2 ? null : Time.from(`2020-01-01T00:00:1${i}Z`),
    description: i === 1 ? null : `desc-${i}`,
    userEmail: 'alice@example.com',
  }
})

// Ensure admin middleware is importable without real env/auth.
await mock.module('@/server/middlewares/auth', () => ({ $$auth: {} }))

const exportRouteMod = await import('@/routes/api/admin/export')
const GET = (exportRouteMod.Route.options.server?.handlers as any)?.GET as (args: {
  request: Request
}) => Promise<Response>

describe('/api/admin/export', () => {
  it('returns 400 when no apps are selected', async () => {
    dbMock.configureExport({ pages: [exportedRows] })
    const res = await GET({
      request: new Request('http://localhost/api/admin/export', {
        method: 'GET',
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Select at least one application to export')
  })

  it('streams NDJSON with a meta line and timeRecorder entries', async () => {
    dbMock.configureExport({ pages: [exportedRows] })
    const res = await GET({
      request: new Request(
        'http://localhost/api/admin/export?apps=timeRecorder&userEmail=alice@example.com',
        { method: 'GET' },
      ),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/x-ndjson')
    expect(res.headers.get('Content-Disposition')).toContain(
      'attachment; filename="miniverso-export-v1-',
    )
    expect(res.body).toBeTruthy()

    const text = await res.text()
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const meta = JSON.parse(lines[0])
    expect(meta.type).toBe('meta')
    expect(meta.format).toBe('miniverso.export.ndjson')
    expect(meta.version).toBe(1)
    expect(meta.filters.userEmail).toBe('alice@example.com')
    expect(meta.apps).toEqual(['timeRecorder'])

    const firstEntry = JSON.parse(lines[1])
    expect(firstEntry.type).toBe('timeRecorder.timeEntry')
    expect(firstEntry.version).toBe(1)
    expect(firstEntry.sourceId).toBe('id-0')
    expect(firstEntry.userEmail).toBe('alice@example.com')
    expect(firstEntry.startedAt).toBe('2020-01-01T00:00:00.000Z')
  })

  it('returns 400 for invalid userEmail query param', async () => {
    dbMock.configureExport({ pages: [exportedRows] })
    const res = await GET({
      request: new Request(
        'http://localhost/api/admin/export?apps=timeRecorder&userEmail=not-an-email',
        { method: 'GET' },
      ),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
  })

  it('does not query DB when timeRecorder is not selected', async () => {
    dbMock.configureExport({ pages: [exportedRows], throwOnQuery: true })
    const res = await GET({
      request: new Request('http://localhost/api/admin/export?apps=otherApp', {
        method: 'GET',
      }),
    })

    expect(res.status).toBe(200)
    const text = await res.text()
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    expect(lines.length).toBe(1)
    const meta = JSON.parse(lines[0])
    expect(meta.apps).toEqual(['otherApp'])
    expect(dbMock.getExportCalls()).toBe(0)
  })

  it('streams all pages (pagination loop)', async () => {
    const page1 = exportedRows.slice(0, 2)
    const page2 = exportedRows.slice(2)
    dbMock.configureExport({ pages: [page1, page2] })

    const res = await GET({
      request: new Request('http://localhost/api/admin/export?apps=timeRecorder', {
        method: 'GET',
      }),
    })

    expect(res.status).toBe(200)
    const lines = (await res.text())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    // meta + 3 entries
    expect(lines.length).toBe(4)
    const ids = lines.slice(1).map((l) => JSON.parse(l).sourceId as string)
    expect(ids).toEqual(['id-0', 'id-1', 'id-2'])
    expect(dbMock.getExportCalls()).toBe(3) // page1, page2, then empty
  })
})
