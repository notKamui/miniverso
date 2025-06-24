type ObjectInput = Record<string, any> | false | null | undefined

export function buildObject(...inputs: ObjectInput[]): Record<string, any> {
  const result: Record<string, any> = {}

  for (const input of inputs) {
    if (!input || typeof input !== 'object') continue
    for (const [key, value] of Object.entries(input)) {
      if (value) {
        result[key] = value
      }
    }
  }

  return result
}
