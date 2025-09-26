import { createStart } from '@tanstack/react-start'
import { $$csrf } from '@/server/middlewares/csrf'
import { $$emitErrors } from '@/server/middlewares/emit-errors'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [$$emitErrors, $$csrf],
  }
})
