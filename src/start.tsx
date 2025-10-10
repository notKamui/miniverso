import { createStart } from '@tanstack/react-start'
import { Time } from '@/lib/utils/time'
import { $$csrf } from '@/server/middlewares/csrf'
import { $$emitErrors } from '@/server/middlewares/emit-errors'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [$$emitErrors, $$csrf],
    serializationAdapters: [Time.adapter],
  }
})
