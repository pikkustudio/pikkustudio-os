import { fileURLToPath } from 'node:url'

export const devContributors = (resolve: (id: string) => string = (id) => import.meta.resolve(id)): string[] => {
  try {
    return [fileURLToPath(resolve('@pikkustudio/addon-inbox/contributor'))]
  } catch {
    return []
  }
}
