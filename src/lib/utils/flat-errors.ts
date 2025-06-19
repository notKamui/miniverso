import { json } from '@tanstack/react-start'

export async function flatErrors<R>(
  fn: () => Promise<R>,
): Promise<R | Response> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof Response && Math.floor(error.status / 100) === 4) {
      return json(await error.json(), { status: error.status })
    }
    console.error(error)
    return json({ message: 'Internal server error' }, { status: 500 })
  }
}
