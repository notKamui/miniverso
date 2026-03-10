import server, { type ServerEntry } from '@tanstack/react-start/server-entry'
import { FastResponse } from 'srvx'

globalThis.Response = FastResponse

export default { fetch: server.fetch } satisfies ServerEntry
