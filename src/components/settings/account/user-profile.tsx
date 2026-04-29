import { useAuth, useIsUsernameAvailable, useSession, useUpdateUser } from '@better-auth-ui/react'
import { useDebouncer } from '@tanstack/react-pacer'
import { Check, X } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useResetOnChange } from '@/lib/hooks/use-reset-on-change'
import { cn } from '@/lib/utils/cn'
import { ChangeAvatar } from './change-avatar'

export type UserProfileProps = {
  className?: string
}

/**
 * Render a profile card that lets the authenticated user view and update their display name, username, and avatar.
 *
 * @param className - Optional additional CSS class names applied to the card container
 * @returns A JSX element containing the profile card with avatar upload and editable name/username fields
 */
export function UserProfile({ className }: UserProfileProps) {
  const { localization, username: usernameConfig } = useAuth()
  const { data: session } = useSession()

  const currentUsername =
    (usernameConfig?.displayUsername ? session?.user?.displayUsername : session?.user?.username) ||
    ''

  const [username, setUsername] = useResetOnChange(currentUsername)

  const {
    mutate: isUsernameAvailable,
    data: usernameData,
    error: usernameError,
    reset: resetUsername,
  } = useIsUsernameAvailable()

  const usernameDebouncer = useDebouncer(
    (value: string) => {
      if (!value.trim() || value.trim() === currentUsername) {
        resetUsername()
        return
      }

      isUsernameAvailable({ username: value.trim() })
    },
    { wait: 500 },
  )

  function handleUsernameChange(value: string) {
    setUsername(value)
    resetUsername()

    if (usernameConfig?.isUsernameAvailable) {
      usernameDebouncer.maybeExecute(value)
    }
  }

  const { mutate: updateUser, isPending } = useUpdateUser({
    onSuccess: () => toast.success(localization.settings.profileUpdatedSuccess),
  })

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
  }>({})

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    updateUser({
      name,
      ...(usernameConfig?.enabled
        ? {
            username: username.trim(),
            ...(usernameConfig.displayUsername ? { displayUsername: username.trim() } : {}),
          }
        : {}),
    })
  }

  const showAvailabilityIndicator =
    usernameConfig?.isUsernameAvailable && username.trim() && username.trim() !== currentUsername

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{localization.settings.profile}</h2>

      <form onSubmit={handleSubmit}>
        <Card className={cn(className)}>
          <CardContent className="flex flex-col gap-6">
            <ChangeAvatar />

            {usernameConfig?.enabled && (
              <Field
                data-invalid={Boolean(usernameError) || (usernameData && !usernameData.available)}
              >
                <Label htmlFor="username">{localization.auth.username}</Label>

                {session ? (
                  <InputGroup>
                    <InputGroupInput
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder={localization.auth.usernamePlaceholder}
                      minLength={usernameConfig.minUsernameLength}
                      maxLength={usernameConfig.maxUsernameLength}
                      disabled={isPending}
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      aria-invalid={
                        Boolean(usernameError) || (usernameData && !usernameData.available)
                      }
                    />

                    {showAvailabilityIndicator && (
                      <InputGroupAddon align="inline-end">
                        {usernameData?.available ? (
                          <Check className="text-foreground" />
                        ) : usernameError || usernameData?.available === false ? (
                          <X className="text-destructive" />
                        ) : (
                          <Spinner />
                        )}
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                ) : (
                  <Skeleton>
                    <Input className="invisible" />
                  </Skeleton>
                )}

                <FieldError>
                  {usernameError?.error?.message ||
                    usernameError?.message ||
                    (usernameData?.available === false && localization.auth.usernameTaken)}
                </FieldError>
              </Field>
            )}

            <Field data-invalid={Boolean(fieldErrors.name)}>
              <Label htmlFor="name">{localization.auth.name}</Label>

              {session ? (
                <Input
                  key={session?.user.name}
                  id="name"
                  name="name"
                  autoComplete="name"
                  defaultValue={session?.user.name}
                  placeholder={localization.auth.name}
                  disabled={isPending}
                  required
                  onChange={() => {
                    setFieldErrors((prev) => ({
                      ...prev,
                      name: undefined,
                    }))
                  }}
                  onInvalid={(e) => {
                    e.preventDefault()

                    setFieldErrors((prev) => ({
                      ...prev,
                      name: (e.target as HTMLInputElement).validationMessage,
                    }))
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
              ) : (
                <Skeleton>
                  <Input className="invisible" />
                </Skeleton>
              )}

              <FieldError>{fieldErrors.name}</FieldError>
            </Field>
          </CardContent>

          <CardFooter>
            <Button type="submit" size="sm" disabled={isPending || !session}>
              {isPending && <Spinner />}

              {localization.settings.saveChanges}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
