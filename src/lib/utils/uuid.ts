export type UUID = string

export function generateUUID(): UUID {
  return crypto.randomUUID() as UUID
}
