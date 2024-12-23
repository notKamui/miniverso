
import { badRequest } from '@server/utils/response'
import { getEvent, getRequestIP } from 'vinxi/http'

export function checkIp(): string {
  const ip = getRequestIP() ?? getRequestIP(getEvent(), { xForwardedFor: true })
  if (!ip) badRequest('Suspicious request without IP address', 400)
  return ip
}
