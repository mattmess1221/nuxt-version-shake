import MagicString from 'magic-string'

import { satisfies } from 'semver'
import { createUnplugin, type TransformResult } from 'unplugin'

import { name } from '../package.json'

const pattern = /\bcheckNuxtVersion\s*\(\s*(".*?")\s*\)/g

function tryExecuteMacro(version: string, range: string): boolean {
  try {
    return satisfies(version, range)
  }
  catch (error) {
    console.error(`Error processing checkNuxtVersion("${range}"):`, error)
    return false
  }
}

const plugin = createUnplugin<{ version: string, map?: boolean }>(({ version, map = true }) => {
  return {
    name,
    transform(code) {
      const magicString = new MagicString(code)
      let result = false
      while (true) {
        const match = pattern.exec(code)
        if (!match) {
          break
        }
        result = true
        const start = match.index
        const end = start + match[0].length
        const range = JSON.parse(match[1])

        const replacement = JSON.stringify(tryExecuteMacro(version, range))
        magicString.overwrite(start, end, replacement)
      }
      if (!result) {
        return null
      }
      const resultObj: TransformResult = {
        code: magicString.toString(),
      }
      if (map) {
        resultObj.map = magicString.generateMap({ hires: true })
      }
      return resultObj
    },
  }
})

export default plugin
