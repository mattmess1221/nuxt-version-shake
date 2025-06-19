import type { Import, UnimportOptions } from 'unimport'
import { createUnimport } from 'unimport'

export async function loadMacroImports(opts: Partial<UnimportOptions>): Promise<Import[]> {
  const imports = createUnimport(opts)

  await imports.init()
  const importMap = await imports.getImports()

  return importMap
}
