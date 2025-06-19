import { satisfies } from 'semver'
import { defineMacros } from './build'
import { logger } from './module'

interface Options {
  version: string
}

export default defineMacros<Options>(({ version }) => ({
  checkNuxtVersion(range) {
    if (typeof range !== 'string') {
      logger.error(`expected a string argument, got ${typeof range}`)
    }
    return satisfies(version, range)
  },
}))
