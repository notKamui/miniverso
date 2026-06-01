import type { SettingsView } from '@better-auth-ui/core'
import { useAuth, useAuthenticate } from '@better-auth-ui/react'
import { Shield, User2 } from 'lucide-react'
import { useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/cn'
import { AccountSettings } from './account/account-settings'
import { SecuritySettings } from './security/security-settings'

export type SettingsProps = {
  className?: string
  path?: string
  /** @remarks `SettingsView` */
  view?: SettingsView
  hideNav?: boolean
}

/**
 * Renders the settings UI and activates the appropriate settings view based on `view` or `path`.
 *
 * @param className - Additional CSS class names applied to the root container
 * @param path - Route path used to resolve which settings view to activate when `view` is not provided
 * @param view - Explicit settings view to activate (for example, `"account"` or `"security"`)
 * @param hideNav - When `true`, hides the settings navigation tabs
 * @returns A JSX element rendering the settings layout and the selected settings panel
 */
export function Settings({ className, view, path, hideNav }: SettingsProps) {
  const { authClient, basePaths, localization, viewPaths, plugins, Link } = useAuth()
  useAuthenticate(authClient)

  if (!view && !path) {
    throw new Error('[Better Auth UI] Either `view` or `path` must be provided')
  }

  const currentView = useMemo(() => {
    if (view) return view
    if (!path) return undefined

    const match = [viewPaths.settings, ...plugins.map((plugin) => plugin.viewPaths?.settings)]
      .flatMap((source) => Object.entries(source ?? {}))
      .find(([, segment]) => segment === path)

    return match?.[0] as SettingsView | undefined
  }, [view, path, viewPaths.settings, plugins])

  if (!currentView) {
    const validPaths = [viewPaths.settings, ...plugins.map((plugin) => plugin.viewPaths?.settings)]
      .flatMap((source) => Object.values(source ?? {}) as string[])
      .join(', ')
    throw new Error(
      `[Better Auth UI] Unknown settings path "${path}". Valid paths are: ${validPaths}`,
    )
  }

  return (
    <Tabs value={currentView} className={cn('w-full gap-4 md:gap-6', className)}>
      <div className={cn(hideNav && 'hidden')}>
        <TabsList aria-label={localization.settings.settings}>
          <TabsTrigger value="account" asChild>
            <Link href={`${basePaths.settings}/${viewPaths.settings.account}`} className="gap-1">
              <User2 className="text-muted-foreground" />

              {localization.settings.account}
            </Link>
          </TabsTrigger>

          <TabsTrigger value="security" asChild>
            <Link href={`${basePaths.settings}/${viewPaths.settings.security}`} className="gap-1">
              <Shield className="text-muted-foreground" />

              {localization.settings.security}
            </Link>
          </TabsTrigger>

          {plugins.flatMap(
            (plugin) =>
              plugin.settingsTabs?.map((settingsTab, index) => (
                <TabsTrigger
                  key={`${plugin.id}-${index.toString()}`}
                  value={settingsTab.view}
                  asChild
                >
                  <Link
                    href={`${basePaths.settings}/${plugin.viewPaths?.settings?.[settingsTab.view]}`}
                    className="gap-1"
                  >
                    {settingsTab.label}
                  </Link>
                </TabsTrigger>
              )) ?? [],
          )}
        </TabsList>
      </div>

      <TabsContent value="account" tabIndex={-1}>
        <AccountSettings />
      </TabsContent>

      <TabsContent value="security" tabIndex={-1}>
        <SecuritySettings />
      </TabsContent>

      {plugins.flatMap((plugin) =>
        plugin.settingsTabs?.map((settingsTab, index) => (
          <TabsContent
            key={`${plugin.id}-${index.toString()}`}
            value={settingsTab.view}
            tabIndex={-1}
          >
            <settingsTab.component />
          </TabsContent>
        )),
      )}
    </Tabs>
  )
}
