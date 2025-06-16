import { useLoaderData } from '@tanstack/react-router'

export function useGlobalContext() {
  return useLoaderData({
    from: '__root__',
  })
}

export type GlobalContext = ReturnType<typeof useGlobalContext>
