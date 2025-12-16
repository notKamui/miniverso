import { createSerializationAdapter } from '@tanstack/react-router'
import { createStart } from '@tanstack/react-start'
import z from 'zod'
import { Time } from '@/lib/utils/time'
import { $$cors } from '@/server/middlewares/cors'
import { $$emitErrors } from '@/server/middlewares/emit-errors'

const zodErrorSerializationAdapter = createSerializationAdapter({
  key: 'zod-error',
  test: (v) => v instanceof z.ZodError,
  toSerializable: (error: z.ZodError) => error.issues as any[],
  fromSerializable: (issues) => new z.ZodError(issues),
})

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [$$emitErrors, $$cors],
    serializationAdapters: [
      zodErrorSerializationAdapter,
      Time.serializationAdapter,
    ],
  }
})
