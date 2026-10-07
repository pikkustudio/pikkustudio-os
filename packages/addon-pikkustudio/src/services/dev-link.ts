import { existsSync, lstatSync, readlinkSync } from 'node:fs'
import { mkdir, rename, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'

const LINKED: Record<string, string> = { cli: 'packages/cli', core: 'packages/core', 'addon-console': 'packages/addon/pikku-console' }

export async function linkDevPikku(projectDir: string, devRoot = process.env.PIKKU_DEV_LINK): Promise<string[]> {
  if (!devRoot) return []
  const linked: string[] = []
  for (const [name, path] of Object.entries(LINKED)) {
    const target = join(devRoot, path)
    const link = join(projectDir, 'node_modules', '@pikku', name)
    if (!existsSync(target) || !existsSync(join(projectDir, 'node_modules', '@pikku'))) continue
    const current = lstatSync(link, { throwIfNoEntry: false })
    if (current?.isSymbolicLink() && readlinkSync(link) === target) continue
    if (current) {
      const saved = join(projectDir, 'node_modules', '.orig-pikku', name)
      if (current.isSymbolicLink() || existsSync(saved)) await rm(link, { recursive: true, force: true })
      else {
        await mkdir(join(projectDir, 'node_modules', '.orig-pikku'), { recursive: true })
        await rename(link, saved)
      }
    }
    await symlink(target, link)
    linked.push(name)
  }
  return linked
}
