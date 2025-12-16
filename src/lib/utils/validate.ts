import { setResponseStatus } from '@tanstack/react-start/server'
import { z } from 'zod'

export function validate<T>(
  schema: z.ZodType<T>,
  options?: { pretty?: boolean },
) {
  return (data: T): T => {
    const {
      success,
      error: zodError,
      data: parsedData,
    } = schema.safeParse(data)

    if (!success) {
      setResponseStatus(400)
      throw options?.pretty ? new Error(z.prettifyError(zodError)) : zodError
    }

    return parsedData
  }
}
