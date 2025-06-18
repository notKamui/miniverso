import { toast } from 'sonner'
import { useEvent } from '@/lib/hooks/use-event'

export function useServerErrors() {
  useEvent('server-error', (event) => {
    toast.error((event as any).detail.body.error)
  })
}
