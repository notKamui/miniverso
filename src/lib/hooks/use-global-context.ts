import { Route } from '@/routes/__root'

export function useGlobalContext() {
  return Route.useLoaderData()
}

export type GlobalContext = ReturnType<typeof useGlobalContext>
