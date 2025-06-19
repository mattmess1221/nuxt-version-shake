import { addBuildPlugin, addImports, createResolver, defineNuxtModule, getNuxtVersion, useLogger } from '@nuxt/kit'
import { name, version } from '../package.json'
import unplugin from './build'
import createMacros from './macros'

export const logger = useLogger(name)

export default defineNuxtModule({
  meta: {
    name,
    version,
  },
  setup(_, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addImports({
      from: resolve('./runtime/checkNuxtVersion'),
      name: 'checkNuxtVersion',
    })

    const version = getNuxtVersion(nuxt)
    const macros = createMacros({ version })

    addBuildPlugin({
      vite: () => unplugin.vite({ macros }),
      rspack: () => unplugin.rspack({ macros }),
      webpack: () => unplugin.webpack({ macros }),
    })
  },
})
