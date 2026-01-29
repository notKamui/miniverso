type Operation<K, T> = [K, (context: T) => void]

export function createFallthroughExec<K extends string, T>(operations: readonly Operation<K, T>[]) {
  const keyIndex = new Map<K, number>()
  for (const [index, [key]] of operations.entries()) {
    keyIndex.set(key, index)
  }

  return (context: T, startKey: K) => {
    const start = keyIndex.get(startKey)
    if (start === undefined) return
    for (let i = start; i < operations.length; i++) {
      operations[i][1](context)
    }
  }
}
