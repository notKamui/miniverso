import type { CaptchaRenderProps } from '@better-auth-ui/react/plugins'
import _HCaptchaWidget from '@hcaptcha/react-hcaptcha'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/lib/hooks/use-theme'
import { hcaptchaInfoQueryOptions } from '@/server/functions/hcaptcha'

export function HCaptchaWidget({ setToken, clearToken, setReset }: CaptchaRenderProps) {
  const { data: hcaptchaInfo } = useSuspenseQuery(hcaptchaInfoQueryOptions())
  const theme = useTheme()
  const ref = useRef<_HCaptchaWidget>(null)

  useEffect(() => {
    setReset(() => ref.current?.resetCaptcha())
    return () => setReset(null)
  }, [setReset])

  if (!hcaptchaInfo.siteKey) {
    return null
  }

  return (
    <_HCaptchaWidget
      ref={ref}
      sitekey={hcaptchaInfo.siteKey}
      onVerify={setToken}
      onExpire={clearToken}
      onError={clearToken}
      theme={theme === 'dark' ? 'dark' : 'light'}
    />
  )
}
