import { useAuth, useSignInSocial, useSignUpEmail } from '@better-auth-ui/react'
import { Eye, EyeOff } from 'lucide-react'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils/cn'
import { Label } from '../ui/label'
import { MagicLinkButton } from './magic-link-button'
import { ProviderButtons, type SocialLayout } from './provider-buttons'

export type SignUpProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: 'top' | 'bottom'
}

/**
 * Renders a sign-up form with name, email, and password fields, optional social provider buttons, and submission handling.
 *
 * Submits credentials to the configured auth client and handles the response:
 * - If email verification is required, shows a notification and navigates to sign-in
 * - On success, refreshes the session and navigates to the configured redirect path
 * - On failure, displays error toasts
 * - Manages a pending state while the request is in-flight
 *
 * @param className - Additional CSS classes applied to the outer container
 * @param socialLayout - Social layout to apply to the component
 * @param socialPosition - Social position to apply to the component
 * @returns The sign-up form React element.
 */
export function SignUp({ className, socialLayout, socialPosition = 'bottom' }: SignUpProps) {
  const {
    basePaths,
    emailAndPassword,
    localization,
    magicLink,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link,
  } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { mutate: signUpEmail, isPending: signUpPending } = useSignUpEmail({
    onError: (error) => {
      setPassword('')
      setConfirmPassword('')
      toast.error(error.error?.message || error.message)
    },
    onSuccess: () => {
      if (emailAndPassword?.requireEmailVerification) {
        toast.success(localization.auth.verifyYourEmail)
        navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` })
      } else {
        navigate({ to: redirectTo })
      }
    },
  })

  const [socialRedirecting, setSocialRedirecting] = useState(false)

  const { mutate: signInSocial, isPending: socialPending } = useSignInSocial({
    onError: (error) => toast.error(error.error?.message || error.message),
    onSuccess: async () => {
      setSocialRedirecting(true)

      setTimeout(() => {
        setSocialRedirecting(false)
      }, 5000)
    },
  })

  const isPending = signUpPending || socialPending || socialRedirecting

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string

    if (emailAndPassword?.confirmPassword && password !== confirmPassword) {
      toast.error(localization.auth.passwordsDoNotMatch)
      setPassword('')
      setConfirmPassword('')
      return
    }

    signUpEmail({ name, email, password })
  }

  const showSeparator = emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{localization.auth.signUp}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === 'top' && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons
                  socialLayout={socialLayout}
                  signInSocial={signInSocial}
                  isPending={isPending}
                />
              )}

              {showSeparator && (
                <FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors.name)}>
                  <Label htmlFor="name">{localization.auth.name}</Label>

                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={localization.auth.namePlaceholder}
                    required
                    disabled={isPending}
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

                  <FieldError>{fieldErrors.name}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors.email)}>
                  <Label htmlFor="email">{localization.auth.email}</Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={localization.auth.emailPlaceholder}
                    required
                    disabled={isPending}
                    onChange={() => {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }))
                    }}
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

                <Field data-invalid={Boolean(fieldErrors.password)}>
                  <Label htmlFor="password">{localization.auth.password}</Label>

                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      name="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }))
                      }}
                      placeholder={localization.auth.passwordPlaceholder}
                      required
                      minLength={emailAndPassword?.minPasswordLength}
                      maxLength={emailAndPassword?.maxPasswordLength}
                      disabled={isPending}
                      onInvalid={(e) => {
                        e.preventDefault()

                        setFieldErrors((prev) => ({
                          ...prev,
                          password: (e.target as HTMLInputElement).validationMessage,
                        }))
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                    />

                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        title={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        onClick={() => {
                          setIsPasswordVisible(!isPasswordVisible)
                        }}
                      >
                        {isPasswordVisible ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>

                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>

                {emailAndPassword?.confirmPassword && (
                  <Field data-invalid={Boolean(fieldErrors.confirmPassword)}>
                    <Label htmlFor="confirmPassword">{localization.auth.confirmPassword}</Label>

                    <InputGroup>
                      <InputGroupInput
                        id="confirmPassword"
                        name="confirmPassword"
                        type={isConfirmPasswordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)

                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                          }))
                        }}
                        placeholder={localization.auth.confirmPasswordPlaceholder}
                        required
                        minLength={emailAndPassword?.minPasswordLength}
                        maxLength={emailAndPassword?.maxPasswordLength}
                        disabled={isPending}
                        onInvalid={(e) => {
                          e.preventDefault()

                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: (e.target as HTMLInputElement).validationMessage,
                          }))
                        }}
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      />

                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          aria-label={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          title={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                        >
                          {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>

                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  </Field>
                )}

                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Spinner />}

                    {localization.auth.signUp}
                  </Button>

                  {magicLink && <MagicLinkButton view="signUp" isPending={isPending} />}
                </div>
              </FieldGroup>
            </form>
          )}

          {socialPosition === 'bottom' && (
            <>
              {showSeparator && (
                <FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons
                  socialLayout={socialLayout}
                  signInSocial={signInSocial}
                  isPending={isPending}
                />
              )}
            </>
          )}
        </div>

        {emailAndPassword?.enabled && (
          <div className="mt-4 flex w-full flex-col items-center gap-3">
            <FieldDescription className="text-center">
              {localization.auth.alreadyHaveAnAccount}{' '}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
                className="underline underline-offset-4"
              >
                {localization.auth.signIn}
              </Link>
            </FieldDescription>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
