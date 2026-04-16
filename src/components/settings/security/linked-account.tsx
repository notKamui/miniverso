import {
  providerIcons,
  useAccountInfo,
  useAuth,
  useLinkSocial,
  useUnlinkAccount,
} from '@better-auth-ui/react'
import { getProviderName } from '@better-auth-ui/react/core'
import type { Account, SocialProvider } from 'better-auth'
import { Link2, Link2Off, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'

export type LinkedAccountProps = {
  account?: Account
  provider: SocialProvider
}

/**
 * Render a single linked social account row with provider info and link/unlink control.
 *
 * Fetches additional account information from the provider using the accountInfo API
 * and displays the provider name, account details, and a link/unlink button.
 *
 * @param account - The account object containing id, accountId, and providerId
 * @param provider - The provider id
 * @returns A JSX element containing the linked account row
 */
export function LinkedAccount({ account, provider }: LinkedAccountProps) {
  const { baseURL, localization } = useAuth()

  const { data: accountInfo, isPending: isLoadingInfo } = useAccountInfo(account?.accountId, {
    enabled: Boolean(account),
    throwOnError: (error) => {
      if (error.error) toast.error(error.error.message)
      return false
    },
  })

  const { mutate: linkSocial, isPending: isLinking } = useLinkSocial({
    onError: (error) => toast.error(error.error?.message || error.message),
  })

  const { mutate: unlinkAccount, isPending: isUnlinking } = useUnlinkAccount({
    onError: (error) => toast.error(error.error?.message || error.message),
    onSuccess: () => toast.success(localization.settings.accountUnlinked),
  })

  const ProviderIcon = providerIcons[provider]
  const providerName = getProviderName(provider)

  const displayName =
    accountInfo?.data?.login ||
    accountInfo?.data?.username ||
    accountInfo?.user?.email ||
    accountInfo?.user?.name ||
    account?.accountId

  return (
    <Card className="border-0 bg-transparent shadow-none ring-0">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          {ProviderIcon ? (
            <ProviderIcon className={cn('size-4.5', !account && 'opacity-50')} />
          ) : (
            <Plug className={cn('size-4.5', !account && 'opacity-50')} />
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-sm leading-tight font-medium">{providerName}</span>

          {account && isLoadingInfo ? (
            <Skeleton className="my-0.5 h-3 w-24" />
          ) : (
            <span className="truncate text-xs text-muted-foreground">
              {account
                ? displayName
                : localization.settings.linkProvider.replace('{{provider}}', providerName)}
            </span>
          )}
        </div>

        {account ? (
          <Button
            className="ml-auto shrink-0"
            variant="outline"
            size="sm"
            onClick={() => unlinkAccount({ providerId: account.providerId })}
            disabled={isUnlinking}
            aria-label={localization.settings.unlinkProvider.replace('{{provider}}', providerName)}
          >
            {isUnlinking ? <Spinner /> : <Link2Off />}
            {localization.settings.unlinkProvider.replace('{{provider}}', '').trim()}
          </Button>
        ) : (
          <Button
            className="ml-auto shrink-0"
            variant="outline"
            size="sm"
            onClick={() =>
              linkSocial({
                provider,
                callbackURL: `${baseURL}${window.location.pathname}`,
              })
            }
            disabled={isLinking}
            aria-label={localization.settings.linkProvider.replace('{{provider}}', providerName)}
          >
            {isLinking ? <Spinner /> : <Link2 />}
            {localization.settings.link}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
