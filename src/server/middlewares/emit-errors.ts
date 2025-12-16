import { createMiddleware } from '@tanstack/react-start'
import { ZodError } from 'zod'
import { ServerErrorEvent } from '@/lib/hooks/use-server-errors'

export const $$emitErrors = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      if (error instanceof ZodError) {
        window?.dispatchEvent(new ServerErrorEvent(error))
      } else if (error instanceof Response) {
        const body = await error.json().catch(() => 'Error on the server')
        window?.dispatchEvent(
          new ServerErrorEvent(
            { body: typeof body === 'object' ? body : { error: body } },
            { sendToast: true },
          ),
        )
      } else if (
        !!error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error?.message === 'string'
      ) {
        try {
          const actualError = JSON.parse(error.message)
          window?.dispatchEvent(
            new ServerErrorEvent({ body: actualError }, { sendToast: true }),
          )
        } catch {
          window?.dispatchEvent(
            new ServerErrorEvent(
              { body: { error: error.message } },
              { sendToast: true },
            ),
          )
        }
      }
      throw error
    }
  })
  .server(async ({ next }) => await next())
