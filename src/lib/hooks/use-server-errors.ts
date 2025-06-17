import { useEvent } from '@/lib/hooks/use-event'
import { toast } from 'sonner'

export function useServerErrors() {
  useEvent('server-error', (event) => {
    toast.error((event as any).detail.body.error)
  })
}
