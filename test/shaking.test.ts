import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'
import { afterAll, vi } from 'vitest'

export function mockNuxtVersion(version: string) {
  afterAll(() => {
    vi.restoreAllMocks()
  })
  vi.mock('@nuxt/kit', async importOriginal => ({
    ...await importOriginal(),
    getNuxtVersion: () => version,
  }))
}

describe('dev shaking', async () => {
  mockNuxtVersion('3.17.5')
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/app', import.meta.url)),
  })
  it('version check is tree-shaken', async () => {
    const html = await $fetch('/')
    expect(html).toContain('__PASS__')
    expect(html).not.toContain('__FAIL__')
  })
})
