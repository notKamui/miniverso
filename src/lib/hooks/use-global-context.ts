import { useRouteContext } from '@tanstack/react-router'

export function useGlobalContext() {
  return useRouteContext({ from: '__root__' })
}

export type GlobalContext = ReturnType<typeof useGlobalContext>
