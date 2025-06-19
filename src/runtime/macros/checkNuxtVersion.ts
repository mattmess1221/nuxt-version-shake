import { getNuxtVersion } from '@nuxt/kit'
import { satisfies } from 'semver'

/**
 * Build-time macro to check the Nuxt version.
 *
 * When used in an if statement, `false` results will cause the block
 * to be tree-shaken.
 *
 * @param range - A semver range string to check against the current Nuxt version.
 *                For example, `">=3.17.0"` or `"^3.17"`.
 *                See [semver documentation](https://semver.org/) for more details.
 * @returns `true` if the current Nuxt version satisfies the given range, `false` otherwise.
 *
 * @example
 * ```js
 * import { checkNuxtVersion } from '#version-shake'
 * if (checkNuxtVersion('>=3.17.0')) {
 *   // This block will be tree-shaken if the Nuxt version is not greater than 3.17.0
 *   console.log('Nuxt version is greater than 3.17.0')
 * }
 * ```
 */
export function checkNuxtVersion(range: string): boolean {
  const version = getNuxtVersion()
  return satisfies(version, range)
}
