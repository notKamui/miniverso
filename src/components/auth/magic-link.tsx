import { useAuth, useSignInMagicLink } from '@better-auth-ui/react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'
import { Label } from '../ui/label'
import { MagicLinkButton } from './magic-link-button'
import { PasskeyButton } from './passkey-button'
import { ProviderButtons, type SocialLayout } from './provider-buttons'

export type MagicLinkProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: 'top' | 'bottom'
}

/**
 * Render a card-based sign-in form that sends an email magic link and optionally shows social provider buttons.
 *
 * @param className - Additional CSS class names applied to the card container
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The magic-link sign-in UI as a JSX element
 */
export function MagicLink({ className, socialLayout, socialPosition = 'bottom' }: MagicLinkProps) {
  const {
    basePaths,
    baseURL,
    localization,
    passkey,
    redirectTo,
    socialProviders,
    viewPaths,
    Link,
  } = useAuth()

  const [email, setEmail] = useState('')

  const { mutate: signInMagicLink, isPending: magicLinkPending } = useSignInMagicLink({
    onSuccess: () => {
      setEmail('')
      toast.success(localization.auth.magicLinkSent)
    },
  })

  const isPending = magicLinkPending

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
  }>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    signInMagicLink({ email, callbackURL: `${baseURL}${redirectTo}` })
  }

  const showSeparator = socialProviders && socialProviders.length > 0

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl">{localization.auth.signIn}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === 'top' && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} isPending={isPending} />
              )}

              {showSeparator && (
                <FieldSeparator className="m-0 flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(fieldErrors.email)}>
                <Label htmlFor="email">{localization.auth.email}</Label>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)

                    setFieldErrors((prev) => ({
                      ...prev,
                      email: undefined,
                    }))
                  }}
                  placeholder={localization.auth.emailPlaceholder}
                  required
                  disabled={isPending}
                  onInvalid={(e) => {
                    e.preventDefault()

                    setFieldErrors((prev) => ({
                      ...prev,
                      email: (e.target as HTMLInputElement).validationMessage,
                    }))
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                />

                <FieldError>{fieldErrors.email}</FieldError>
              </Field>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner />}

                  {localization.auth.sendMagicLink}
                </Button>

                <MagicLinkButton view="magicLink" isPending={isPending} />

                {passkey && <PasskeyButton isPending={isPending} />}
              </div>
            </FieldGroup>
          </form>

          {socialPosition === 'bottom' && (
            <>
              {showSeparator && (
                <FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} isPending={isPending} />
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex w-full flex-col items-center gap-3">
          <FieldDescription className="text-center">
            {localization.auth.needToCreateAnAccount}{' '}
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
              className="underline underline-offset-4"
            >
              {localization.auth.signUp}
            </Link>
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  )
}
