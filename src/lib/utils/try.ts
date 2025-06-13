export function tryInline<T, E extends Error = Error>(
  func: () => T,
  catchableErrors: (new (...args: any[]) => E)[] = [],
): [error: E, success: null] | [error: null, success: T] {
  try {
    const result = func()
    return [null, result]
  } catch (error) {
    if (
      catchableErrors.length > 0 &&
      !catchableErrors.some((ErrorClass) => error instanceof ErrorClass)
    ) {
      throw error
    }
    return [error as E, null]
  }
}

export async function tryAsync<T, E extends Error = Error>(
  promise: Promise<T>,
  catchableErrors: (new (...args: any[]) => E)[] = [],
): Promise<[error: E, success: null] | [error: null, success: T]> {
  try {
    const result = await promise
    return [null, result]
  } catch (error) {
    if (
      catchableErrors.length > 0 &&
      !catchableErrors.some((ErrorClass) => error instanceof ErrorClass)
    ) {
      throw error
    }
    return [error as E, null]
  }
}
