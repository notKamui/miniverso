import { describe, expect, it } from 'vite-plus/test'
import { Collection } from '@/lib/utils/collection'

describe('Collection.mergeRecordsByKeys', () => {
  it('merges multiple records by their keys', () => {
    type Doc = { kind: 'doc'; v: number }
    type Config = { kind: 'config'; enabled: boolean }

    const doc: Record<string, Doc> = {
      rust: { kind: 'doc', v: 1 },
      python: { kind: 'doc', v: 2 },
    }

    const config: Record<string, Config> = {
      rust: { kind: 'config', enabled: true },
    }

    const res = Collection.mergeRecordsByKeys({ doc, config })

    expect(res).toEqual({
      rust: {
        doc: { kind: 'doc', v: 1 },
        config: { kind: 'config', enabled: true },
      },
      python: {
        doc: { kind: 'doc', v: 2 },
        config: undefined,
      },
    })

    expect('config' in res.python).toBe(true)
    expect(res.python.config).toBe(undefined)
  })
})
