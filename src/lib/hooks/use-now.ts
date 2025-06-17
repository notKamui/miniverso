import { Time } from '@/lib/utils/time'
import { useEffect, useState } from 'react'

export function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  return Time.from(now)
}
