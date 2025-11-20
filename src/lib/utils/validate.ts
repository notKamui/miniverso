import { ZodError, type ZodType, type z } from 'zod'
import { badRequest } from '@/lib/utils/response'
import { tryAsync, tryInline } from '@/lib/utils/try'

export function validate<S extends ZodType>(
  schema: S,
  options?: { async?: false },
): (data: z.infer<S>) => z.infer<S>

export function validate<S extends ZodType>(
  schema: S,
  options?: { async: true },
): (data: z.infer<S>) => Promise<z.infer<S>>

export function validate<S extends ZodType>(
  schema: S,
  options?: { async?: boolean },
) {
  type Data = z.infer<S>
  return options?.async
    ? async (data: Data) => {
        const [error, result] = await tryAsync(schema.parseAsync(data), [
          ZodError,
        ])
        respondIfError(error)
        return result
      }
    : (data: Data) => {
        const [error, result] = tryInline(() => schema.parse(data), [ZodError])
        respondIfError(error)
        return result
      }
}

function respondIfError(error: ZodError | null) {
  if (!error) return
  badRequest('Validation error', 400, { errors: error.issues })
}
