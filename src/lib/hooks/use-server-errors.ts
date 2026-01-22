import { toast } from 'sonner'
import * as z from 'zod'
import { useEvent } from '@/lib/hooks/use-event'

export class ServerErrorEvent extends CustomEvent<{ body: { error: string } }> {
  static readonly type = 'server-error'

  constructor(
    detail: { body: { error: string } } | z.ZodError,
    public options?: { sendToast?: boolean },
  ) {
    super(ServerErrorEvent.type, {
      detail: detail instanceof z.ZodError ? { body: { error: z.prettifyError(detail) } } : detail,
    })
  }
}

export function useServerErrors() {
  useEvent(ServerErrorEvent.type, (event) => {
    if (!(event instanceof ServerErrorEvent)) return
    if (event.options?.sendToast) {
      toast.error(event.detail.body.error)
    }
  })
}
