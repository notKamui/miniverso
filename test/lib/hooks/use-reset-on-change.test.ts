/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResetOnChange, useResetOnChangeByKey } from '@/lib/hooks/use-reset-on-change'

describe('useResetOnChange', () => {
  it('syncs when the source value changes', () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useResetOnChange(v), {
      initialProps: { v: 'a' },
    })
    expect(result.current[0]).toBe('a')

    act(() => {
      result.current[1]('draft')
    })
    expect(result.current[0]).toBe('draft')

    rerender({ v: 'b' })
    expect(result.current[0]).toBe('b')
  })
})

describe('useResetOnChangeByKey', () => {
  it('resets when the key changes even if the value string is unchanged', () => {
    const { result, rerender } = renderHook(
      ({ key, value }: { key: string; value: string }) => useResetOnChangeByKey(key, value),
      { initialProps: { key: 'entry-1', value: 'same' } },
    )
    expect(result.current[0]).toBe('same')

    act(() => {
      result.current[1]('user draft')
    })
    expect(result.current[0]).toBe('user draft')

    rerender({ key: 'entry-2', value: 'same' })
    expect(result.current[0]).toBe('same')
  })

  it('syncs when the value changes for the same key', () => {
    const { result, rerender } = renderHook(
      ({ key, value }: { key: string; value: string }) => useResetOnChangeByKey(key, value),
      { initialProps: { key: 'entry-1', value: 'v1' } },
    )

    rerender({ key: 'entry-1', value: 'v2' })
    expect(result.current[0]).toBe('v2')
  })
})
