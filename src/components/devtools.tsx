import { lazy, Suspense } from 'react'

const LazyPanels = lazy(async () => {
  const [reactDevtools, queryDevtools, routerDevtools] = await Promise.all([
    import('@tanstack/react-devtools'),
    import('@tanstack/react-query-devtools'),
    import('@tanstack/react-router-devtools'),
  ])

  function Inner() {
    return (
      <reactDevtools.TanStackDevtools
        plugins={[
          {
            name: 'Tanstack Query',
            render: <queryDevtools.ReactQueryDevtoolsPanel />,
          },
          {
            name: 'Tanstack Router',
            render: <routerDevtools.TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    )
  }

  return { default: Inner }
})

// Devtools are only needed in development. We avoid any static imports so
// production builds (and prod dependency installs) don't need these packages.
export function DevTools() {
  if (!import.meta.env.DEV) return null

  return (
    <Suspense fallback={null}>
      <LazyPanels />
    </Suspense>
  )
}
