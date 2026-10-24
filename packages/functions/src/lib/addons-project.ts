import { cp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Studio } from './studio.js'

const run = promisify(execFile)

export const ADDONS_KEY = 'addons'
export const ADDONS_APP = 'addons-ui'

const studioRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

const templateRoot = join(studioRoot, 'templates', 'addons-project')

const skipped = (source: string) => /(^|\/)(node_modules|\.pikku|\.vite)(\/|$)|\.gen\./.test(source)

const git = (cwd: string, ...args: string[]) =>
  run('git', ['-c', 'user.name=Studio', '-c', 'user.email=studio@localhost', ...args], { cwd })

const FRAMEWORK_PATHS = ['src/lib', 'src/middleware', 'src/services.ts', 'src/config.ts', 'src/auth.ts', 'apps/addons-ui/src']

async function syncFramework(dir: string): Promise<boolean> {
  for (const path of FRAMEWORK_PATHS) {
    await cp(join(templateRoot, path), join(dir, path), { recursive: true, force: true, filter: (source) => !skipped(source) })
  }
  const { stdout } = await git(dir, 'status', '--porcelain', '--', ...FRAMEWORK_PATHS)
  if (stdout.trim().length === 0) return false
  await git(dir, 'add', '-f', '--', ...FRAMEWORK_PATHS)
  await git(dir, 'commit', '-q', '--no-verify', '-m', 'Update the Add-ons project framework', '--', ...FRAMEWORK_PATHS)
  return true
}

export async function ensureAddonsProject(studio: Studio): Promise<void> {
  const dir = join(studio.home, ADDONS_KEY)
  if (existsSync(join(dir, '.git'))) {
    await syncFramework(dir)
    const served = join(studio.home, 'worktrees', ADDONS_KEY)
    if (existsSync(served)) await syncFramework(served)
    return
  }
  await mkdir(dir, { recursive: true })
  await cp(templateRoot, dir, { recursive: true, filter: (source) => !skipped(source) })
  await symlink(join(studioRoot, 'node_modules'), join(dir, 'node_modules'))
  await mkdir(join(dir, 'apps', ADDONS_APP, 'node_modules'), { recursive: true })
  await writeFile(join(dir, 'apps', ADDONS_APP, 'node_modules', '.gitkeep'), '')
  await git(dir, 'init', '-q', '-b', 'main')
  await git(dir, 'add', '-A', '-f')
  await git(dir, 'commit', '-q', '--no-verify', '-m', 'Add-ons project')
  await studio.projects.add(dir, ADDONS_KEY)
  await studio.projects.updateDatabase(ADDONS_KEY)
}

export type AddonScreen = { path: string; title: string; nav: boolean }
export type AddonEntry = { name: string; title: string; screens: AddonScreen[] }

export async function readInstalledAddons(worktree: string): Promise<AddonEntry[]> {
  const file = join(worktree, '.pikku', 'screens', 'pikku-installed-addons.gen.ts')
  if (!existsSync(file)) return []
  const source = (await readFile(file, 'utf8'))
    .replace(/component:\s*\(\)\s*=>\s*import\([^)]*\)\s*as never/g, 'component: null')
    .replace(/^[\s\S]*?export const installedAddons\s*=/, 'return ')
  return (new Function(source)() as { name: string; title: string; screens: { path: string; title: string; nav?: boolean }[] }[]).map(({ name, title, screens }) => ({
    name,
    title,
    screens: screens.map((screen) => ({ path: screen.path, title: screen.title, nav: !!screen.nav })),
  }))
}
