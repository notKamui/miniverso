import { badRequest } from '@/lib/utils/response'
import { getEvent, getRequestIP } from '@tanstack/react-start/server'

export function checkIp(): string {
  const ip = getRequestIP() ?? getRequestIP(getEvent(), { xForwardedFor: true })
  if (!ip) badRequest('Suspicious request without IP address', 400)
  return ip
}
