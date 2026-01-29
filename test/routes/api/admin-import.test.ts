import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Time } from '@/lib/utils/time'

// Install shared mocks once.
await import('@/../test/helpers/mock-auth')
const dbMock = await import('@/../test/helpers/mock-server-db')

function makeNdjsonStream(text: string) {
  const encoder = new TextEncoder()
  // Split intentionally to exercise incremental parsing across chunk boundaries.
  const mid = Math.max(1, Math.floor(text.length / 2))
  const partA = text.slice(0, mid)
  const partB = text.slice(mid)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(partA))
      controller.enqueue(encoder.encode(partB))
      controller.close()
    },
  })
}

// Ensure admin middleware is importable without real env/auth.
await mock.module('@/server/middlewares/auth', () => ({ $$auth: {} }))

const importRouteMod = await import('@/routes/api/admin/import')
const POST = (importRouteMod.Route.options.server?.handlers as any)?.POST as (args: {
  request: Request
}) => Promise<Response>

describe('/api/admin/import', () => {
  beforeEach(() => {
    dbMock.resetImportState({
      users: [{ id: 'u1', email: 'known@example.com' }],
      initialTimeEntriesById: new Map([
        [
          'existing-id',
          {
            id: 'existing-id',
            userId: 'u1',
            startedAt: Time.from('2020-01-01T00:00:00Z'),
            endedAt: null,
            description: 'old',
          },
        ],
      ]),
    })
  })

  it('returns 400 when request body is missing', async () => {
    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing request body')
  })

  it('imports time entries, skips unknown users, and updates existing ids', async () => {
    const meta = {
      type: 'meta',
      format: 'miniverso.export.ndjson',
      version: 1,
      exportedAt: '2020-01-01T00:00:00.000Z',
      filters: {},
      apps: ['timeRecorder'],
    }

    const known = {
      type: 'timeRecorder.timeEntry',
      version: 1,
      sourceId: 'existing-id',
      userEmail: 'known@example.com',
      startedAt: '2020-01-01T01:00:00.000Z',
      endedAt: null,
      description: 'new',
    }

    const unknown = {
      type: 'timeRecorder.timeEntry',
      version: 1,
      sourceId: 'new-id',
      userEmail: 'unknown@example.com',
      startedAt: '2020-01-01T02:00:00.000Z',
      endedAt: null,
      description: null,
    }

    const ndjson = `${JSON.stringify(meta)}\n${JSON.stringify(known)}\n${JSON.stringify(unknown)}\n`

    const stream = makeNdjsonStream(ndjson)
    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
        body: stream,
      }),
    })

    expect(res.status).toBe(200)
    const summary = await res.json()
    expect(summary.ok).toBe(true)
    expect(summary.version).toBe(1)
    expect(summary.apps).toEqual(['timeRecorder'])
    expect(summary.processedLines).toBe(3)
    expect(summary.importedTimeEntries).toBe(1)
    expect(summary.skippedUnknownUser).toBe(1)

    const { timeEntriesById } = dbMock.getImportState()
    const updated = timeEntriesById.get('existing-id')!
    expect(updated.description).toBe('new')
    expect(updated.userId).toBe('u1')
    // Ensure Time parsing happened.
    expect(updated.startedAt.toISOString()).toBe('2020-01-01T01:00:00.000Z')
  })

  it('defaults to importing timeRecorder when apps query is omitted', async () => {
    const meta = {
      type: 'meta',
      format: 'miniverso.export.ndjson',
      version: 1,
    }
    const entry = {
      type: 'timeRecorder.timeEntry',
      version: 1,
      sourceId: 'new-id',
      userEmail: 'known@example.com',
      startedAt: '2020-01-01T03:00:00.000Z',
      endedAt: null,
      description: null,
    }
    const ndjson = `${JSON.stringify(meta)}\n${JSON.stringify(entry)}\n`

    const res = await POST({
      request: new Request('http://localhost/api/admin/import', {
        method: 'POST',
        body: makeNdjsonStream(ndjson),
      }),
    })

    expect(res.status).toBe(200)
    const summary = await res.json()
    expect(summary.apps).toEqual(['timeRecorder'])
    expect(summary.importedTimeEntries).toBe(1)
  })

  it('returns 400 when apps are selected but do not include timeRecorder', async () => {
    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=otherApp', {
        method: 'POST',
        body: makeNdjsonStream(''),
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Select at least one application to import')
  })

  it('returns 400 for invalid meta header', async () => {
    const badMeta = {
      type: 'meta',
      format: 'wrong.format',
      version: 1,
    }
    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
        body: makeNdjsonStream(`${JSON.stringify(badMeta)}\n`),
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
  })

  it('ignores unknown line types and trims/ignores blank lines', async () => {
    const meta = {
      type: 'meta',
      format: 'miniverso.export.ndjson',
      version: 1,
    }
    const unknown = { type: 'some.future.type', version: 1, foo: 'bar' }
    const entry = {
      type: 'timeRecorder.timeEntry',
      version: 1,
      sourceId: 'new-id',
      userEmail: 'known@example.com',
      startedAt: '2020-01-01T04:00:00.000Z',
      endedAt: null,
      description: null,
    }

    const ndjson =
      `\n  \n${JSON.stringify(meta)}\n` +
      `${JSON.stringify(unknown)}\n` +
      `  \n${JSON.stringify(entry)}\n\n`

    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
        body: makeNdjsonStream(ndjson),
      }),
    })
    expect(res.status).toBe(200)
    const summary = await res.json()
    // processedLines only counts non-empty trimmed lines
    expect(summary.processedLines).toBe(3)
    expect(summary.importedTimeEntries).toBe(1)
  })

  it('returns 400 for an empty import file', async () => {
    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
        body: makeNdjsonStream(''),
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Empty import file')
  })

  it('returns 400 on invalid JSON line and reports processedLines', async () => {
    const ndjson =
      '{"type":"meta","format":"miniverso.export.ndjson","version":1}\n{not valid json}\n'

    const res = await POST({
      request: new Request('http://localhost/api/admin/import?apps=timeRecorder', {
        method: 'POST',
        body: makeNdjsonStream(ndjson),
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON line')
    expect(body.processedLines).toBe(2)
  })
})
