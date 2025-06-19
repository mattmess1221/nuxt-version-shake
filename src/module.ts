import type { MacroOptions } from './build/plugin'
import { addBuildPlugin, addTypeTemplate, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'
import unplugin from './build'
import { loadMacroImports } from './macros'

export const logger = useLogger(name)

export default defineNuxtModule({
  meta: {
    name,
    version,
  },
  async setup(_, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const imports = await loadMacroImports({
      dirs: [resolve('./runtime/macros')],
    })
    const buildOptions = {
      alias: '#version-shake',
      imports,
    } satisfies MacroOptions

    addBuildPlugin({
      vite: () => unplugin.vite(buildOptions),
      rspack: () => unplugin.rspack(buildOptions),
      webpack: () => unplugin.webpack(buildOptions),
    })

    nuxt.options.alias[buildOptions.alias] = addTypeTemplate({
      filename: 'version-shake.d.ts',
      getContents: () => imports
        .map(({ as, from, name }) => `export { ${name} as ${as} } from ${JSON.stringify(from)}`)
        .join('\n'),
    }).dst
  },
})
