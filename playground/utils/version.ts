export function useNuxtMessage() {
  return checkNuxtVersion('>=4.0.0')
    ? 'You are running the Nuxt 4 release'
    : checkNuxtVersion('>=4.0.0-beta.0')
      ? 'You are running the Nuxt 4 beta'
      : checkNuxtVersion('>=4.0.0-alpha.0')
        ? 'You are running the Nuxt 4 alpha'
        : checkNuxtVersion('>=3.17.0')
          ? 'You are running Nuxt 3.17+'
          : checkNuxtVersion('>=3.0.0')
            ? 'You are running Nuxt 3+'
            : checkNuxtVersion('>=2.0.0')
              ? 'You are running Nuxt 2? :('
              : 'Your nuxt version is old!'
}
