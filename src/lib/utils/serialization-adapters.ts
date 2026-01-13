import { createSerializationAdapter } from '@tanstack/react-router'
import * as z from 'zod'

export const zodErrorSerializationAdapter = createSerializationAdapter({
  key: 'zod-error',
  test: (v) => v instanceof z.ZodError,
  toSerializable: (error: z.ZodError) => error.issues as any[],
  fromSerializable: (issues) => new z.ZodError(issues),
})

export const responseSerializationAdapter = createSerializationAdapter({
  key: 'response',
  test: (v) => v instanceof Response,
  toSerializable: (response: Response) => {
    return {
      body: JSON.stringify(response.body),
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
    }
  },
  fromSerializable: (obj) =>
    new Response(obj.body, {
      status: obj.status,
      statusText: obj.statusText,
      headers: new Headers(obj.headers),
    }),
})
