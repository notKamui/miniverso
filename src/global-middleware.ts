import { $$csrf } from '@/server/middlewares/csrf'
import { $$emitErrors } from '@/server/middlewares/emit-errors'
import { registerGlobalMiddleware } from '@tanstack/react-start'

registerGlobalMiddleware({
  middleware: [$$emitErrors, $$csrf],
})
