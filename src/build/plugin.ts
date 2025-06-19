import type { CallExpression, ImportDeclaration, ImportSpecifier } from '@oxc-project/types'
import type { Identifier, ScopeTrackerNode } from 'oxc-walker'
import type { Import } from 'unimport'
import MagicString from 'magic-string'
import { parseAndWalk, ScopeTracker } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { name } from '../../package.json'

type MacroImport = Pick<Import, 'from' | 'name'>

interface ImportAliases {
  [alias: string]: string
}

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

interface MacroOptions {
  macros: MacroImport[]
  importAliases: ImportAliases
  mapfile?: boolean
}

export default createUnplugin<MacroOptions>(({ macros, importAliases, mapfile = true }) => {
  const importSources = new Set(macros.map(({ from }) => from))

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
      const importedMacros: Record<string, MacroImport> = {}

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
            && importSources.has(node.source.value)
          ) {
            const importName = node.source.value
            importNodes.push(node)
            for (const specifier of node.specifiers) {
              if (
                specifier.type === 'ImportSpecifier'
                && specifier.imported.type === 'Identifier'
              ) {
                const localName = specifier.local.name
                importedMacros[localName] = { name: specifier.imported.name, from: importName }
              }
            }
          }

          // find all the macros being used
          if (node.type === 'CallExpression') {
            const { callee, arguments: _arguments } = node
            if (callee.type === 'Identifier' && callee.name in importedMacros) {
              // ignore shadowed function calls
              const declaration = scopeTracker.getDeclaration(callee.name)
              if (declaration?.type !== 'Import'
                || declaration.node.type !== 'ImportSpecifier'
                || declaration.importNode.type !== 'ImportDeclaration') {
                return
              }
              localUseCounts[callee.name] ??= 0
              localUseCounts[callee.name] += 1

              // limit arguments to literal values
              if (!_arguments.every(arg => arg.type === 'Literal')) {
                transformErrors.push(
                  `${callee.name} at ${formatLine(node.start)} can only be used with literal values.`,
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

        let from = declaration.importNode.source.value
        while (from in importAliases) {
          from = importAliases[from]
        }
        const name = declaration.node.imported.name

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
