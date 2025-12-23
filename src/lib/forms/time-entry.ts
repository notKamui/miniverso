import { z } from 'zod'

export const EditTimeEntrySchema = z
  .object({
    startedAt: z
      .string()
      // 00:00 to 23:59
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Started at must be a valid time',
      }),
    endedAt: z
      .string()
      // 00:00 to 23:59
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Ended at must be a valid time',
      }),
    description: z.string().max(2000, {}),
  })
  .refine(
    (data) =>
      !data.endedAt || !data.startedAt || data.endedAt >= data.startedAt,
    {
      error: 'End time must be after (or equal to) start time',
      path: ['endedAt'],
    },
  )
