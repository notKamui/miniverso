import { createStart } from '@tanstack/react-start'
import { $fetch } from '@/lib/utils/fetch'
import * as serializationAdapters from '@/lib/utils/serialization-adapters'
import { Time } from '@/lib/utils/time'
import { $$cors } from '@/server/middlewares/cors'
import { $$zodCapture } from '@/server/middlewares/zod-capture'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [$$zodCapture, $$cors],
    serializationAdapters: [...Object.values(serializationAdapters), Time.serializationAdapter],
    serverFns: {
      fetch: $fetch,
    },
  }
})
