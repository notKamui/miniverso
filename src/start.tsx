import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { $fetch } from '@/lib/utils/fetch'
import * as serializationAdapters from '@/lib/utils/serialization-adapters'
import { Time } from '@/lib/utils/time'
import { $$cors } from '@/server/middlewares/cors'
import { $$zodCapture } from '@/server/middlewares/zod-capture'

const $$csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [$$csrfMiddleware, $$cors],
    functionMiddleware: [$$zodCapture],
    serializationAdapters: [...Object.values(serializationAdapters), Time.serializationAdapter],
    serverFns: {
      fetch: $fetch,
    },
  }
})
