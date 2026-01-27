import { CustomFetch } from '@tanstack/react-start'
import { ServerErrorEvent } from '../hooks/use-server-errors'
import { tryInline } from './try'

async function treatError(error: unknown) {
  if (!(error instanceof Response)) {
    throw error
  }

  const clone = error.clone()
  const body = await clone.text()

  if (body.includes('$TSR/t/zod-error')) {
    throw error // throw back the original error for reparsing by TSStart
  }

  const [raw, parsed] = tryInline(() => JSON.parse(body) as { error: string })
  if (raw) {
    throw raw
  }
  window?.dispatchEvent(new ServerErrorEvent({ body: parsed }, { sendToast: true }))
  throw new Error(parsed.error)
}

export const $fetch: CustomFetch = async (input, init) => {
  const response = await window.fetch(input, init)
  if (!response.ok) {
    await treatError(response)
  }
  return response
}

$fetch.preconnect = async (url) => {
  return window.fetch(url, {
    method: 'HEAD',
    mode: 'no-cors',
  })
}
