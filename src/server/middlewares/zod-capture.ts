import { createMiddleware } from '@tanstack/react-start'
import * as z from 'zod'
import { ServerErrorEvent } from '@/lib/hooks/use-server-errors'

export const $$zodCapture = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        globalThis.window?.dispatchEvent(new ServerErrorEvent(error, { sendToast: true }))
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        // Ignore abort errors
      }
      throw error
    }
  })
  .server(async ({ next }) => await next())
