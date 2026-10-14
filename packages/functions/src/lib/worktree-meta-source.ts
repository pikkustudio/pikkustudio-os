import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FunctionsMeta } from '@pikku/core/services'

export interface WorktreeMetaRef {
  projectId: string | null
  gitSha: string | null
}

export const worktreeMetaSource = (projectDir: (projectId: string) => Promise<string>) => ({
  async read(ref: WorktreeMetaRef): Promise<FunctionsMeta | null> {
    if (!ref.projectId) return null
    const dir = await projectDir(ref.projectId).catch(() => null)
    if (!dir) return null
    const file = join(dir, '.pikku', 'function', 'pikku-functions-meta-verbose.gen.json')
    const raw = await readFile(file, 'utf8').catch(() => null)
    return raw ? (JSON.parse(raw) as FunctionsMeta) : null
  },
})
