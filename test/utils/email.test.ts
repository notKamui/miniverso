import { describe, expect, it, mock } from 'bun:test'

// Prepare mocks before importing the module under test
const sendMock = mock(async (args: any) => ({ ok: true, args }))
let constructedApiKey: string | undefined

// Mock env module used by email.tsx
await mock.module('@/lib/env/server', () => ({
  env: {
    RESEND_API_KEY: 'test-resend-key',
    RESEND_MAIL_DOMAIN: 'example.com',
    BASE_URL: 'https://app.example.com',
  },
}))

// Mock Resend SDK
await mock.module('resend', () => ({
  Resend: class Resend {
    emails = { send: sendMock }
    constructor(apiKey: string) {
      constructedApiKey = apiKey
    }
  },
}))

// Mock EmailTemplate to a simple factory that exposes props for inspection
await mock.module('@daveyplate/better-auth-ui/server', () => ({
  EmailTemplate: (props: any) => ({ __type: 'EmailTemplate', props }),
}))

// Now import the module under test
const emailMod = await import('@/lib/utils/email')

describe('email utils', () => {
  it('initializes Resend with API key from env', async () => {
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
    // react payload comes from mocked EmailTemplate
    expect(call.react.__type).toBe('EmailTemplate')
    expect(call.react.props.action).toBe('Reset password')
    expect(call.react.props.heading).toBe('Reset your password')
    expect(call.react.props.url).toBe('https://app.example.com/reset?token=abc')
    expect(call.react.props.imageUrl).toBe('https://app.example.com/logo512.png')
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
    expect(call.react.props.imageUrl).toBe('https://cdn.example.com/img.png')
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
    expect(call.react.__type).toBe('EmailTemplate')
    expect(call.react.props.action).toBe('Verify email')
    expect(call.react.props.heading).toBe('Verify your email address')
    expect(call.react.props.url).toBe('https://app.example.com/verify?token=xyz')
    expect(call.react.props.imageUrl).toBe('https://app.example.com/logo512.png')
  })
})
