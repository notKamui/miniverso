import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

export function DevTools() {
  if (!import.meta.env.DEV) return null

  return (
    <TanStackDevtools
      plugins={[
        {
          name: 'Tanstack Query',
          render: <ReactQueryDevtoolsPanel />,
        },
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
      ]}
    />
  )
}
