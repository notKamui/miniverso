import { EmailTemplate } from '@daveyplate/better-auth-ui/server'
import { Resend } from 'resend'
import { env } from '@/lib/env/server'

export const resend = new Resend(env.RESEND_API_KEY)

export type MailOptions = {
  to: string
  name?: string
  imageUrl?: string
}

export async function sendResetPasswordEmail(
  options: MailOptions & { url: string },
) {
  const name = options.name || options.to.split('@')[0]

  return await resend.emails.send({
    from: `Miniverso <app@${env.RESEND_MAIL_DOMAIN}>`,
    to: options.to,
    subject: 'Reset your password',
    react: EmailTemplate({
      action: 'Reset password',
      content: (
        <>
          <p>{`Hello ${name},`}</p>
          <p>Click the button below to reset your password.</p>
        </>
      ),
      heading: 'Reset your password',
      url: options.url,
      imageUrl: options.imageUrl ?? `${env.BASE_URL}/logo512.png`,
    }),
  })
}

export async function sendVerificationEmail(
  options: MailOptions & { url: string },
) {
  const name = options.name || options.to.split('@')[0]

  return await resend.emails.send({
    from: `Miniverso <app@${env.RESEND_MAIL_DOMAIN}>`,
    to: options.to,
    subject: 'Verify your email address',
    react: EmailTemplate({
      action: 'Verify email',
      content: (
        <>
          <p>{`Hello ${name},`}</p>
          <p>Click the button below to verify your email address.</p>
        </>
      ),
      heading: 'Verify your email address',
      url: options.url,
      imageUrl: options.imageUrl ?? `${env.BASE_URL}/logo512.png`,
    }),
  })
}
