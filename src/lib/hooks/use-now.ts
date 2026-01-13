import { useHydrated } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Time } from '@/lib/utils/time'

export function useNow() {
  const isHydrated = useHydrated()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return isHydrated ? Time.from(now) : null
}
