import {
  EmailVerificationEmail,
  MagicLinkEmail,
  ResetPasswordEmail,
} from '@better-auth-ui/react/email'
import { Resend } from 'resend'
import { env } from '@/lib/env/server'

export const resend =
  env.RESEND_API_KEY && env.RESEND_MAIL_DOMAIN
    ? new Resend(env.RESEND_API_KEY)
    : ({
        emails: {
          send: () => Promise.resolve(),
        },
      } as unknown as Resend)

export type MailOptions = {
  to: string
  name?: string
  imageUrl?: string
}

export async function sendResetPasswordEmail(options: MailOptions & { url: string }) {
  return await resend.emails.send({
    from: `Miniverso <app@${env.RESEND_MAIL_DOMAIN}>`,
    to: options.to,
    subject: 'Reset your password',

    react: (
      <ResetPasswordEmail
        url={options.url}
        email={options.to}
        appName="Miniverso"
        expirationMinutes={60}
        logoURL={options.imageUrl ?? `${env.BASE_URL}/logo512.png`}
        darkMode
      />
    ),
  })
}

export async function sendVerificationEmail(options: MailOptions & { url: string }) {
  return await resend.emails.send({
    from: `Miniverso <app@${env.RESEND_MAIL_DOMAIN}>`,
    to: options.to,
    subject: 'Verify your email address',

    react: (
      <EmailVerificationEmail
        url={options.url}
        email={options.to}
        appName="Miniverso"
        expirationMinutes={60}
        logoURL={options.imageUrl ?? `${env.BASE_URL}/logo512.png`}
        darkMode
      />
    ),
  })
}

export async function sendMagicLinkEmail(options: MailOptions & { url: string }) {
  return await resend.emails.send({
    from: `Miniverso <app@${env.RESEND_MAIL_DOMAIN}>`,
    to: options.to,
    subject: 'Your magic link',

    react: (
      <MagicLinkEmail
        url={options.url}
        email={options.to}
        appName="Miniverso"
        expirationMinutes={60}
        logoURL={options.imageUrl ?? `${env.BASE_URL}/logo512.png`}
        darkMode
      />
    ),
  })
}
