import type { Import } from 'unimport'
import { addBuildPlugin, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'
import unplugin from './build'

export const logger = useLogger(name)

export default defineNuxtModule({
  meta: {
    name,
    version,
  },
  setup(_, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const importName = '#version-shake'
    const macros: Import[] = [
      {
        from: importName,
        name: 'checkNuxtVersion',
      },
    ]

    nuxt.options.alias[importName] = resolve('./runtime/macros')

    const buildOptions = {
      macros,
      // Import aliases must be passed to the build plugin
      // so that the unimport plugin can resolve them correctly.
      // Import aliases are not available during build-time.
      importAliases: {
        [importName]: resolve('./runtime/macros/index.js'),
      },
    }

    addBuildPlugin({
      vite: () => unplugin.vite(buildOptions),
      rspack: () => unplugin.rspack(buildOptions),
      webpack: () => unplugin.webpack(buildOptions),
    })
  },
})
