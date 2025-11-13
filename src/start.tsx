import { createStart } from '@tanstack/react-start'
import { Time } from '@/lib/utils/time'
import { $$cors } from '@/server/middlewares/cors'
import { $$emitErrors } from '@/server/middlewares/emit-errors'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [$$emitErrors, $$cors],
    serializationAdapters: [Time.serializationAdapter],
  }
})
