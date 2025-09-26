import { getRequestIP } from '@tanstack/react-start/server'
import { badRequest } from '@/lib/utils/response'

export function checkIp(): string {
  const ip = getRequestIP() ?? getRequestIP({ xForwardedFor: true })
  if (!ip) badRequest('Suspicious request without IP address', 400)
  return ip
}
