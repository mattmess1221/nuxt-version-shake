# Nuxt Version Shake

Easy version checking for nuxt with tree-shaking support.

This module is designed for module and layer authors to assist in multi-version support.

## Installation

This module should be installed to your layer or module's dependencies group.

```sh
pnpm add nuxt-version-shake
```

If you are writing a layer, add the module to your `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-version-shake'],
})
```

If you are writing a module, install the module inside your module setup.

```ts
import { defineNuxtModule, installModule } from '@nuxt/kit'

export default defineNuxtModule({
  async setup() {
    await installModule('nuxt-version-shake')
  },
})
```

## Usage

All macros must be explicitly imported from `#version-shake`.

The `checkNuxtVersion(range)` utility is a build-time macro which accepts a semver range and returns a boolean. If it returns false, the resulting block will be tree-shaken on build.

Options:

| Name    | Type   | Description                                                           |
| ------- | ------ | --------------------------------------------------------------------- |
| `range` | string | The version range that should satsify the nuxt version. See `semver`. |

> [!NOTE]
> Only literals are supported as arguments. Do not use variables or constants. They will not be detected.

### Example

Passing a computed key to `useAsyncData` when Nuxt is at least 3.17.0

```ts
import { checkNuxtVersion } from '#version-shake'

export function useMyData(options) {
  const key = computed(() => '...')
  return useAsyncData(
    // check will be compiled away
    checkNuxtVersion('>=3.17.0') ? key : key.value,
    async () => {
      // ...
    }
  )
}
```
