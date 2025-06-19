import type imports from '#imports'
import type { Node } from '@oxc-project/types'

export type Literal = Extract<Node, { type: 'Literal' }>['value']

type Imports = typeof imports

type FilterLiteralFnKeys<T> = {
  [K in keyof T]: T extends (...args: Literal[]) => Literal ? K : never
}

export type ImportableMacros = {
  [K in keyof FilterLiteralFnKeys<Imports>]?: Imports[K]
}

export interface MacroOptions {
  macros: ImportableMacros
  mapfile?: boolean
}

export interface DefineMacroFactory<Options> {
  (options: Options): MacroOptions['macros']
}

export function defineMacros<Options>(factory: DefineMacroFactory<Options>): typeof factory {
  return factory
}
