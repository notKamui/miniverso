import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_APP_VERSION: z.string().regex(/^\d+\.\d+\.\d+(-\w+)?$/),
  },
  extends: [],
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
