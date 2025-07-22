import { toast } from 'sonner'
import { useEvent } from '@/lib/hooks/use-event'

export class ServerErrorEvent extends CustomEvent<{ body: { error: string } }> {
  static readonly type = 'server-error'

  constructor(detail: { body: { error: string } }) {
    super(ServerErrorEvent.type, { detail })
  }
}

export function useServerErrors() {
  useEvent(ServerErrorEvent.type, (event) => {
    if (!(event instanceof ServerErrorEvent)) return
    toast.error(event.detail.body.error)
  })
}
