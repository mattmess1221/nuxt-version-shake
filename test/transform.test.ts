import type { Plugin, TransformResult } from 'vite'
import { describe, expect, it } from 'vitest'
import plugin from '../src/build'

describe('transform', () => {
  it('base', async () => {
    const result = await transform(
      'const value = checkNuxtVersion(">3.17.0")',
    )
    expect(result).toMatchInlineSnapshot(
      `\
{
  "code": "const value = true",
}
`,
    )
  })

  it('multiple calls', async () => {
    const result = await transform(
      `\
const value = checkNuxtVersion(">3.17.0")
const value2 = checkNuxtVersion("<5.0.0")
`,
    )
    expect(result).toMatchInlineSnapshot(
      `\
{
  "code": "const value = true
const value2 = true
",
}
`,
    )
  })

  it('no changes', async () => {
    const result = await transform('const value = 1234')
    expect(result).toBeNull()
  })

  it('with map', async () => {
    const result = await transform('const value = checkNuxtVersion("^3.17")', { map: true })
    expect(result).toMatchInlineSnapshot(`\
{
  "code": "const value = true",
  "map": SourceMap {
    "file": undefined,
    "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC",
    "names": [],
    "sources": [
      "",
    ],
    "sourcesContent": undefined,
    "version": 3,
  },
}
`)
  })
})

async function transform(code: string, { map = false }: { map?: boolean } = {}): Promise<TransformResult> {
  const p = plugin.vite({ version: '3.17.5', map }) as Plugin
  // @ts-expect-error confusing vite types
  return await p.transform(code, 'app.vue')
}
