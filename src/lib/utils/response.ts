import type { Range } from '@/lib/utils/types'

export function badRequest(message: any, status: Range<400, 499>, data?: any): never {
  throw Response.json({ error: message, data }, { status })
}

export function serverError(message: any, status: Range<500, 599>, data?: any): never {
  throw Response.json({ error: message, data }, { status })
}
