import type { TransformResult } from 'unplugin'
import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import plugin from '../src/build'
import { loadMacroImports } from '../src/macros'
import { logger } from '../src/module'

const DEFAULT_IMPORT = `import { checkNuxtVersion } from '#version-shake'`

logger.level = 0

describe('transform', () => {
  vi.mock('@nuxt/kit', async importOriginal => ({
    ...await importOriginal(),
    getNuxtVersion: () => '3.17.5',
  }))

  it.for([
    ['single', '\''],
    ['double', '"'],
  ])('base - %s quotes', async ([,quote]) => {
    const code = await transform(`\
${DEFAULT_IMPORT}
const value = checkNuxtVersion(${quote}>3.17.0${quote})
`,
    )
    expect(code).toMatchInlineSnapshot(`\
{
  "code": "
const value = true
",
  "map": undefined,
}
`,
    )
  })

  it('multiple calls', async () => {
    const result = await transform(
      `\
${DEFAULT_IMPORT}
const value = checkNuxtVersion(">3.17.0")
const value2 = checkNuxtVersion("<5.0.0")
`,
    )
    expect(result).toMatchInlineSnapshot(
      `\
{
  "code": "
const value = true
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
    ['different function', 'mycheckNuxtVersion(">3.17.0")'],
    ['no macro', 'const value = 1234'],
  ])('no changes[%s]', async ([,code]) => {
    const result = await transform(code)
    expect(result).toBeNull()
  })

  it('macro is unused', async () => {
    const result = await transform(`import { checkNuxtVersion } from "#version-shake"`)
    expect(result).toMatchInlineSnapshot(`
{
  "code": "",
  "map": undefined,
}`)
  })

  it('alias import', async () => {
    const result = await transform(`\
import { checkNuxtVersion as check } from '#version-shake'
const value = check(">3.17.0")
`)
    expect(result).toMatchInlineSnapshot(`\
{
  "code": "
const value = true
",
  "map": undefined,
}
`)
  })

  it('shadowed import', async () => {
    const result = await transform(
      `\
import { checkNuxtVersion } from '#version-shake'
function check() {
  const checkNuxtVersion = (range) => true
  return checkNuxtVersion(">3.17.0")
}
`,
    )
    expect(result).toMatchInlineSnapshot(`\
{
  "code": "
function check() {
  const checkNuxtVersion = (range) => true
  return checkNuxtVersion(">3.17.0")
}
",
  "map": undefined,
}
    `)
  })

  it('with map', async () => {
    const result = await transform(
      `\
${DEFAULT_IMPORT}
const value = checkNuxtVersion("^3.17")
`,
      { mapfile: true },
    )
    expect(result).toMatchInlineSnapshot(`\
{
  "code": "
const value = true
",
  "map": SourceMap {
    "file": undefined,
    "mappings": ";AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",
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

  describe('errors', () => {
    it('parse[uses variable]', async () => {
      const result = transform(
        `\
${DEFAULT_IMPORT}
const version = "3.17"
checkNuxtVersion(version)
`,
      )
      await expect(
        result,
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `\
[Error: Macro transformation errors in app.vue:
- checkNuxtVersion at app.vue:3:1 can only be used with literal values.]
      `,
      )
    })
    it('macro', async () => {
      const result = transform(
        `\
import { logErrorOnBuild } from '#version-shake'
logErrorOnBuild()
`,
      )
      await expect(result).rejects.toThrowErrorMatchingInlineSnapshot(
        `\
[Error: Error processing macro logErrorOnBuild at app.vue:2:1: Error: This is a test macro that fails the build.]
`,
      )
    })
  })
})

function resolve(path: string): string {
  return fileURLToPath(new URL(path, import.meta.url))
}

const imports = await loadMacroImports({
  dirs: [
    resolve('../src/runtime/macros'),
  ],
  imports: [
    { from: resolve('./fixtures/macros'), name: 'logErrorOnBuild' },
  ],
})

async function transform(code: string, { mapfile = false }: { mapfile?: boolean } = {}): Promise<TransformResult> {
  const p = plugin.vite({
    alias: '#version-shake',
    imports,
    mapfile,
  }) as Plugin
  // @ts-expect-error confusing vite types
  return await p.transform(code, 'app.vue')
}
