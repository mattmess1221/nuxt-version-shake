import { addBuildPlugin, addImports, createResolver, defineNuxtModule, getNuxtVersion } from '@nuxt/kit'
import { name, version } from '../package.json'
import unplugin from './build'

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

    addBuildPlugin({
      vite: () => unplugin.vite({ version }),
      rspack: () => unplugin.rspack({ version }),
      webpack: () => unplugin.webpack({ version }),
    })
  },
})
