import type { Literal, MacroOptions } from './macros'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { name } from '../../package.json'
import { logger } from '../module'

interface FunctionalMacro {
  (...args: Literal[]): Literal
}

export default createUnplugin<MacroOptions>(({ macros, mapfile = true }) => {
  function isMacroDefined(name: string): name is keyof typeof macros {
    return Object.prototype.hasOwnProperty.call(macros, name)
  }

  return {
    name,
    transform: (code, id) => {
      function formatLine(index: number): string {
        const lineno = code.slice(0, index).split('\n').length
        const colno = index - code.lastIndexOf('\n', index)
        return `${id}:${lineno}:${colno}`
      }

      const s = new MagicString(code)
      parseAndWalk(code, id, {
        enter: (node) => {
          if (node.type === 'CallExpression') {
            const { callee } = node
            if (callee.type === 'Identifier' && isMacroDefined(callee.name)) {
              // limit arguments to literal values
              if (!node.arguments.every(arg => arg.type === 'Literal')) {
                logger.warn(`${callee.name} at ${formatLine(node.start)} can only be used with literal values.`)
                return
              }

              const macro = macros[callee.name] as FunctionalMacro
              if (typeof macro === 'undefined') {
                logger.warn(`${callee.name} at ${formatLine(node.start)} is not defined.`)
                return
              }

              const args = node.arguments.map(arg => arg.value)
              let replacement: Literal
              try {
                replacement = JSON.stringify(macro(...args))
              }
              catch (error) {
                logger.error(`Error processing macro ${callee.name} at ${formatLine(node.start)}`, error)
                return
              }

              s.overwrite(node.start, node.end, replacement)
            }
          }
        },

      })

      return s.hasChanged()
        ? {
            code: s.toString(),
            map: mapfile ? s.generateMap({ hires: true }) : undefined,
          }
        : null
    },
  }
})
