import type { CallExpression, ImportDeclaration, ImportSpecifier } from '@oxc-project/types'
import type { Identifier, ScopeTrackerNode } from 'oxc-walker'
import type { Import } from 'unimport'
import MagicString from 'magic-string'
import { parseAndWalk, ScopeTracker } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { name } from '../../package.json'

type MacroExpression = Omit<CallExpression, 'arguments' | 'callee'> & {
  callee: Extract<CallExpression['callee'], { type: 'Identifier' }>
  arguments: Extract<CallExpression['arguments'][number], { type: 'Literal' }>[]
}

type ScopeTrackerImport = Extract<ScopeTrackerNode, { type: 'Import' }> & {
  node: ImportSpecifier & {
    imported: Identifier
  }
  importNode: ImportDeclaration
}

export interface MacroOptions {
  alias: string
  imports: Import[]
  mapfile?: boolean
}

export default createUnplugin<MacroOptions>(({ alias, imports, mapfile = true }) => {
  const importSources = new Set(imports.map(i => i.as))

  return {
    name,
    transform: async (code, id) => {
      function formatLine(index: number): string {
        const lineno = code.slice(0, index).split('\n').length
        const colno = index - code.lastIndexOf('\n', index)
        return `${id}:${lineno}:${colno}`
      }

      const s = new MagicString(code)

      const importNodes: ImportDeclaration[] = []
      const callNodes: [MacroExpression, ScopeTrackerImport][] = []

      // import { imported as local } from source
      // { [local]: {from: source, name: imported} }
      const importedMacros: Record<string, Import> = {}

      const scopeTracker = new ScopeTracker()

      const localUseCounts: Record<string, number> = {}

      const transformErrors: string[] = []

      // Parse the code and walk through the AST
      // to find macro imports and usages.
      // `scopeTracker` will track the scope of each identifier
      // and help us identify shadowed identifiers
      parseAndWalk(code, id, {
        scopeTracker,
        enter: (node) => {
          // populate imported macros
          if (
            node.type === 'ImportDeclaration'
            && node.importKind !== 'type'
            && node.source.value === alias
          ) {
            importNodes.push(node)
            for (const specifier of node.specifiers) {
              if (
                specifier.type === 'ImportSpecifier'
                && specifier.imported.type === 'Identifier'
                && importSources.has(specifier.imported.name)
              ) {
                const importedName = specifier.imported.name
                const localName = specifier.local.name
                importedMacros[localName] = imports.find(i => i.as === importedName)!
              }
              else {
                transformErrors.push(`${formatLine(node.start)}: Unknown import`)
                return
              }
            }
          }

          // find all the macros being used
          if (node.type === 'CallExpression') {
            if (node.callee.type === 'Identifier' && node.callee.name in importedMacros) {
              // ignore shadowed function calls
              const declaration = scopeTracker.getDeclaration(node.callee.name)
              if (declaration?.type !== 'Import'
                || declaration.node.type !== 'ImportSpecifier'
                || declaration.importNode.type !== 'ImportDeclaration') {
                return
              }
              localUseCounts[node.callee.name] ??= 0
              localUseCounts[node.callee.name] += 1

              // limit arguments to literal values
              if (!node.arguments.every(arg => arg.type === 'Literal')) {
                transformErrors.push(
                  `${node.callee.name} at ${formatLine(node.start)} can only be used with literal values.`,
                )
                return
              }

              callNodes.push([node, declaration] as typeof callNodes[number])
            }
          }
        },
      })

      if (transformErrors.length) {
        throw new Error(`Macro transformation errors in ${id}:\n${transformErrors.map(s => `- ${s}`).join('\n')}`)
      }

      // import and execute macros
      for (const [node, declaration] of callNodes) {
        const { callee } = node

        const { from, name } = importedMacros[declaration.node.local.name]

        const macro = (await import(from))[name]

        const args = node.arguments.map(arg => arg.value)
        let replacement
        try {
          replacement = JSON.stringify(macro(...args))
        }
        catch (error) {
          throw new Error(
            `Error processing macro ${callee.name} at ${formatLine(node.start)}: ${error}`,
            { cause: error },
          )
        }

        s.overwrite(node.start, node.end, replacement)
        localUseCounts[node.callee.name] -= 1
      }

      // clean up unused imports
      for (const node of importNodes) {
        const obsoleteImports = node.specifiers.filter(spec => (localUseCounts[spec.local.name] ?? 0) === 0)

        for (const spec of obsoleteImports) {
          s.overwrite(spec.start, spec.end, '')
        }

        if (obsoleteImports.length === node.specifiers.length) {
          s.overwrite(node.start, node.end, '')
        }
      }

      return s.hasChanged()
        ? {
            code: s.toString(),
            map: mapfile ? s.generateMap({ hires: true }) : undefined,
          }
        : null
    },
  }
})
