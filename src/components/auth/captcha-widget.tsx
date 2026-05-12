import type { CaptchaRenderProps } from '@better-auth-ui/react/plugins'
import { type TurnstileInstance, Turnstile } from '@marsidev/react-turnstile'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { captchaInfoQueryOptions } from '@/server/functions/captcha'

export function CaptchaWidget({ setToken, clearToken, setReset }: CaptchaRenderProps) {
  const ref = useRef<TurnstileInstance>(null)
  const { data: captchaInfo } = useSuspenseQuery(captchaInfoQueryOptions())

  useEffect(() => {
    setReset(() => ref.current?.reset())
    return () => setReset(null)
  }, [setReset])

  if (!captchaInfo.siteKey) {
    return null
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={captchaInfo.siteKey}
      onSuccess={setToken}
      onError={clearToken}
      onExpire={clearToken}
      options={{ size: 'flexible' }}
    />
  )
}
