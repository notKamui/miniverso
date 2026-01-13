import { useEffect, useState } from 'react'
import { Time } from '@/lib/utils/time'

export function useNow() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return now ? Time.from(now) : null
}
