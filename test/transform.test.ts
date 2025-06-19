import type { TransformResult } from 'unplugin'
import type { Plugin } from 'vite'
import { describe, expect, it } from 'vitest'
import plugin from '../src/build'
import createMacros from '../src/macros'

describe('transform', () => {
  it.for([
    ['single', '\''],
    ['double', '"'],
  ])('base - %s quotes', async ([,quote]) => {
    const code = await transform(`const value = checkNuxtVersion(${quote}>3.17.0${quote})`)
    expect(code).toMatchInlineSnapshot(`\
{
  "code": "const value = true",
  "map": undefined,
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
  "map": undefined,
}
`,
    )
  })

  it.for([
    ['empty file', ''],
    ['not called', 'checkNuxtVersion'],
    ['uses variable', 'const version = "3.17"\ncheckNuxtVersion(version)'],
    ['different function', 'mycheckNuxtVersion(">3.17.0")'],
  ])('no changes[%s]', async ([,code]) => {
    const result = await transform(code)
    expect(result).toBeNull()
  })
  it('no changes', async () => {
    const result = await transform('const value = 1234')
    expect(result).toBeNull()
  })

  it('with map', async () => {
    const result = await transform('const value = checkNuxtVersion("^3.17")', { mapfile: true })
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

async function transform(code: string, { mapfile = false }: { mapfile?: boolean } = {}): Promise<TransformResult> {
  const macros = createMacros({ version: '3.17.5' })
  const p = plugin.vite({ macros, mapfile }) as Plugin
  // @ts-expect-error confusing vite types
  return await p.transform(code, 'app.vue')
}
