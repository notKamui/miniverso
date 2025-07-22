import { createMiddleware } from '@tanstack/react-start'
import { ServerErrorEvent } from '@/lib/hooks/use-server-errors'

export const $$emitErrors = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    try {
      return await next()
    } catch (error: any) {
      if (typeof error?.message === 'string') {
        const actualError = JSON.parse(error.message)
        window.dispatchEvent(new ServerErrorEvent(actualError))
      }
      throw error
    }
  })
  .server(async ({ next }) => await next())
