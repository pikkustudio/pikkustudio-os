import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Where @pikkustudio/addon-inbox is installed, for Studio to link into the projects it runs. None in a compiled binary, where it cannot be resolved. */
export const inboxPackageDir = (
  resolve: (id: string) => string = (id) => import.meta.resolve(id),
): string | undefined => {
  try {
    return dirname(dirname(fileURLToPath(resolve('@pikkustudio/addon-inbox/src/contributors.js'))))
  } catch {
    return undefined
  }
}
