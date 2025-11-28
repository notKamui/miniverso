import { createServerOnlyFn } from '@tanstack/react-start'
import type { BetterAuthPlugin } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/plugins'

export function tanstackStartCookie(): BetterAuthPlugin {
  return createServerOnlyFn(() => ({
    id: 'tanstack-start-cookie',
    hooks: {
      after: [
        {
          matcher() {
            return true
          },
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.responseHeaders

            if ('_flag' in ctx && ctx._flag === 'router') return

            if (returned instanceof Headers) {
              const setCookies = returned?.get('set-cookie')
              if (!setCookies) return

              const parsed = parseSetCookieHeader(setCookies)
              const { setCookie } = await import('@tanstack/react-start/server')

              parsed.forEach((value, key) => {
                if (!key) return
                const opts = {
                  sameSite: value.samesite,
                  secure: value.secure,
                  maxAge: value['max-age'],
                  httpOnly: value.httponly,
                  domain: value.domain,
                  path: value.path,
                } as const
                try {
                  setCookie(key, decodeURIComponent(value.value), opts)
                } catch (_) {
                  /* empty */
                }
              })
              return
            }
          }),
        },
      ],
    },
  }))()
}

interface CookieAttributes {
  value: string
  'max-age'?: number | undefined
  expires?: Date | undefined
  domain?: string | undefined
  path?: string | undefined
  secure?: boolean | undefined
  httponly?: boolean | undefined
  samesite?: ('strict' | 'lax' | 'none') | undefined
  [key: string]: unknown
}

export function parseSetCookieHeader(
  setCookie: string,
): Map<string, CookieAttributes> {
  const cookies = new Map<string, CookieAttributes>()
  const cookieArray = setCookie.split(', ')

  cookieArray.forEach((cookieString) => {
    const parts = cookieString.split(';').map((part) => part.trim())
    const [nameValue, ...attributes] = parts
    const [name, ...valueParts] = (nameValue || '').split('=')

    const value = valueParts.join('=')

    if (!name || value === undefined) {
      return
    }

    const attrObj: CookieAttributes = { value }

    attributes.forEach((attribute) => {
      const [attrName, ...attrValueParts] = attribute!.split('=')
      const attrValue = attrValueParts.join('=')

      const normalizedAttrName = attrName!.trim().toLowerCase()

      switch (normalizedAttrName) {
        case 'max-age':
          attrObj['max-age'] = attrValue
            ? Number.parseInt(attrValue.trim(), 10)
            : undefined
          break
        case 'expires':
          attrObj.expires = attrValue ? new Date(attrValue.trim()) : undefined
          break
        case 'domain':
          attrObj.domain = attrValue ? attrValue.trim() : undefined
          break
        case 'path':
          attrObj.path = attrValue ? attrValue.trim() : undefined
          break
        case 'secure':
          attrObj.secure = true
          break
        case 'httponly':
          attrObj.httponly = true
          break
        case 'samesite':
          attrObj.samesite = attrValue
            ? (attrValue.trim().toLowerCase() as 'strict' | 'lax' | 'none')
            : undefined
          break
        default:
          // Handle any other attributes
          attrObj[normalizedAttrName] = attrValue ? attrValue.trim() : true
          break
      }
    })

    cookies.set(name, attrObj)
  })

  return cookies
}
