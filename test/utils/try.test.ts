import { describe, expect, it } from 'bun:test'
import { tryAsync, tryInline } from '../../src/lib/utils/try'

class CustomError extends Error {}
class OtherError extends Error {}

describe('tryInline', () => {
  it('returns [null, result] on success', () => {
    const [err, res] = tryInline(() => 42)
    expect(err).toBeNull()
    expect(res).toBe(42)
  })

  it('returns [error, null] when thrown error is catchable', () => {
    const [err, res] = tryInline(() => {
      throw new CustomError('boom')
    }, [CustomError])
    expect(res).toBeNull()
    expect(err).toBeInstanceOf(CustomError)
    expect(err?.message).toBe('boom')
  })

  it('rethrows when error is not in catchableErrors', () => {
    expect(() =>
      tryInline(() => {
        throw new OtherError('nope')
      }, [CustomError]),
    ).toThrow(OtherError)
  })
})

describe('tryAsync', () => {
  it('resolves to [null, result] on success', async () => {
    const [err, res] = await tryAsync(Promise.resolve('ok'))
    expect(err).toBeNull()
    expect(res).toBe('ok')
  })

  it('resolves to [error, null] when rejected error is catchable', async () => {
    const [err, res] = await tryAsync(Promise.reject(new CustomError('bad')), [
      CustomError,
    ])
    expect(res).toBeNull()
    expect(err).toBeInstanceOf(CustomError)
    expect(err?.message).toBe('bad')
  })

  it('rethrows when rejected error is not catchable', async () => {
    await expect(() =>
      tryAsync(Promise.reject(new OtherError('ouch')), [CustomError]),
    ).toThrow()
  })
})
