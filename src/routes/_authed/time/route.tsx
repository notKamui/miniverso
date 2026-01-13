import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

export const Route = createFileRoute('/_authed/time')({
  validateSearch: z.object({
    tz: z.coerce.number().int().min(-840).max(840).optional(),
  }),
  loader: () => ({
    crumb: 'Time recorder',
  }),
})
