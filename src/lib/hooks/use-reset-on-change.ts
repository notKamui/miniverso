import { type Dispatch, type SetStateAction, useState } from 'react'

const valueOnlySyncKey = Symbol('useResetOnChange')

/**
 * Local state that resets to `value` whenever `value` changes between renders.
 *
 * Implements React's recommended "adjusting state during render" pattern as a
 * reusable hook — cheaper than a `useEffect` sync because it avoids an extra
 * commit and paint.
 *
 * @see https://react.dev/reference/react/useState#storing-information-from-previous-renders
 *
 * @example
 * const [draft, setDraft] = useResetOnChange(serverValue)
 */
export function useResetOnChange<T>(
  value: T,
  valueEqual: (a: T, b: T) => boolean = Object.is,
): [T, Dispatch<SetStateAction<T>>] {
  return useResetOnChangeByKey(valueOnlySyncKey, value, valueEqual)
}

/**
 * Like {@link useResetOnChange}, but also resets when `key` changes — even if
 * `value` is equal under `Object.is` (e.g. two entries with the same title).
 *
 * Use when local draft state is scoped to an entity id (or similar) and must
 * reset on entity switch, while still syncing when the server value updates for
 * the same entity.
 *
 * @example
 * const [draft, setDraft] = useResetOnChangeByKey(entry?.id ?? null, entry?.text ?? '')
 */
export function useResetOnChangeByKey<K, T>(
  key: K,
  value: T,
  valueEqual: (a: T, b: T) => boolean = Object.is,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(value)
  const [prevKey, setPrevKey] = useState(key)
  const [prevValue, setPrevValue] = useState(value)

  const keyChanged = !Object.is(key, prevKey)
  const valueChanged = !valueEqual(value, prevValue)

  if (keyChanged || valueChanged) {
    setPrevKey(key)
    setPrevValue(value)
    setState(value)
  }

  return [state, setState]
}
