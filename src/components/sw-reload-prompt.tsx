/// <reference types="vite-plugin-pwa/client" />

import { useRegisterSW } from 'virtual:pwa-register/react'

export function SWReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg">
      <span className="text-sm">
        {offlineReady ? 'App ready to work offline' : 'New content available'}
      </span>
      <div className="flex items-center gap-2">
        {needRefresh && <button onClick={() => updateServiceWorker(true)}>Reload</button>}
        <button onClick={close}>Close</button>
      </div>
    </div>
  )
}
