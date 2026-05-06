import { describe, expect, it, vi } from 'vite-plus/test'

// Prepare mocks before importing the module under test
const sendMock = vi.fn((args: any) => ({ ok: true, args }))
let constructedApiKey: string | undefined

// Mock env module used by email.tsx
vi.mock('@/lib/env/server', () => ({
  env: {
    RESEND_API_KEY: 'test-resend-key',
    RESEND_MAIL_DOMAIN: 'example.com',
    BASE_URL: 'https://app.example.com',
  },
}))

// Mock Resend SDK
vi.mock('resend', () => ({
  Resend: class Resend {
    emails = { send: sendMock }
    constructor(apiKey: string) {
      constructedApiKey = apiKey
    }
  },
}))

// Mock better-auth-ui email components so JSX element type/props are inspectable
vi.mock('@better-auth-ui/react', () => ({
  ResetPasswordEmail: 'ResetPasswordEmail',
  EmailVerificationEmail: 'EmailVerificationEmail',
}))

// Now import the module under test
const emailMod = await import('@/lib/utils/email')

describe('email utils', () => {
  it('initializes Resend with API key from env', () => {
    expect(constructedApiKey).toBe('test-resend-key')
    // resend instance is created at module load; ensure it exists
    expect(emailMod.resend).toBeDefined()
  })

  it('sendResetPasswordEmail builds correct payload and defaults imageUrl', async () => {
    sendMock.mockReset()
    await emailMod.sendResetPasswordEmail({
      to: 'john.doe@example.com',
      url: 'https://app.example.com/reset?token=abc',
    })

    // We don't assert on result shape to avoid coupling to SDK types; we check the call payload instead
    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0]?.[0]
    expect(call.from).toBe('Miniverso <app@example.com>')
    expect(call.to).toBe('john.doe@example.com')
    expect(call.subject).toBe('Reset your password')
    expect(call.react.type).toBe('ResetPasswordEmail')
    expect(call.react.props.url).toBe('https://app.example.com/reset?token=abc')
    expect(call.react.props.email).toBe('john.doe@example.com')
    expect(call.react.props.appName).toBe('Miniverso')
    expect(call.react.props.expirationMinutes).toBe(60)
    expect(call.react.props.logoURL).toBe('https://app.example.com/logo512.png')
    expect(call.react.props.darkMode).toBe(true)
  })

  it('sendResetPasswordEmail respects provided imageUrl and name', async () => {
    sendMock.mockReset()
    await emailMod.sendResetPasswordEmail({
      to: 'alice@example.com',
      name: 'Alice',
      url: 'https://app.example.com/reset',
      imageUrl: 'https://cdn.example.com/img.png',
    })
    const call = sendMock.mock.calls[0]?.[0]
    expect(call.react.type).toBe('ResetPasswordEmail')
    expect(call.react.props.logoURL).toBe('https://cdn.example.com/img.png')
  })

  it('sendVerificationEmail builds correct payload', async () => {
    sendMock.mockReset()
    await emailMod.sendVerificationEmail({
      to: 'bob@example.com',
      url: 'https://app.example.com/verify?token=xyz',
    })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0]?.[0]
    expect(call.from).toBe('Miniverso <app@example.com>')
    expect(call.to).toBe('bob@example.com')
    expect(call.subject).toBe('Verify your email address')
    expect(call.react.type).toBe('EmailVerificationEmail')
    expect(call.react.props.url).toBe('https://app.example.com/verify?token=xyz')
    expect(call.react.props.email).toBe('bob@example.com')
    expect(call.react.props.appName).toBe('Miniverso')
    expect(call.react.props.expirationMinutes).toBe(60)
    expect(call.react.props.logoURL).toBe('https://app.example.com/logo512.png')
    expect(call.react.props.darkMode).toBe(true)
  })
})
