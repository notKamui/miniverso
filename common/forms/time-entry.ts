import { z } from 'zod'

export const EditTimeEntrySchema = z.object({
  startedAt: z
    .string()
    // 00:00 to 23:59
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Started at must be a valid time',
    })
    .optional(),
  endedAt: z
    .string()
    // 00:00 to 23:59
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Ended at must be a valid time',
    })
    .optional(),
  description: z.string().optional(),
})