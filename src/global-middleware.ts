import { registerGlobalMiddleware } from '@tanstack/react-start'
import { $$csrf } from '@/server/middlewares/csrf'
import { $$emitErrors } from '@/server/middlewares/emit-errors'

registerGlobalMiddleware({
  middleware: [$$emitErrors, $$csrf],
})
