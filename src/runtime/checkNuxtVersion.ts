import {consola} from "consola"

export function checkNuxtVersion(_spec: string): boolean {
  if (import.meta.dev) {
    consola.withTag("nuxt-version-shake").warn('checkNuxtVersion only supports string literals.')
    return false
  }
  throw new Error('checkNuxtVersion is a compiler macro and should not be used in production.')
}
