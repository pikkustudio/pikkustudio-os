import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { lstat, mkdir, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

export const INBOX_PACKAGE = '@pikkustudio/addon-inbox'

const WIRING = `import { wireAddon } from '@pikku/core/addon'

wireAddon({ name: 'inbox', package: '${INBOX_PACKAGE}', contributors: ['inbox'] })
`

const declaresInbox = (projectDir: string): boolean => {
  try {
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'))
    return [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies, pkg.optionalDependencies].some(
      (group) => group && INBOX_PACKAGE in group,
    )
  } catch {
    return false
  }
}

const linkPackage = async (projectDir: string, packageDir: string): Promise<void> => {
  const link = join(projectDir, 'node_modules', ...INBOX_PACKAGE.split('/'))
  const existing = await lstat(link).catch(() => undefined)
  if (existing?.isSymbolicLink()) {
    if ((await readlink(link)) === packageDir) return
    await rm(link, { force: true })
  } else if (existing) {
    return
  }
  await mkdir(dirname(link), { recursive: true })
  await symlink(packageDir, link, 'dir')
}

export interface InboxCaptureInjection {
  /** The config to hand `pikku dev` with `--config`. */
  overlay: string
  /** The inbox package's real directory, which a confined project process must be able to read. */
  packageDir: string
}

/**
 * Makes a managed project hand the emails it sends to the Studio inbox without the project knowing: the
 * inbox package is linked into its `node_modules`, a wiring file inside `runtimeDir` opts in to its `inbox` contributor,
 * and an overlay config adds that directory to the project's own `srcDirectories`. The wiring sets no `expose`, so none of
 * the inbox's functions is reachable from the project.
 *
 * Returns undefined when the project has no pikku config, or declares the inbox package itself and so owns the opt-in.
 */
export const injectInboxCapture = async (options: {
  projectDir: string
  runtimeDir: string
  inboxPackageDir: string
}): Promise<InboxCaptureInjection | undefined> => {
  const { projectDir, runtimeDir } = options
  const config = join(projectDir, 'pikku.config.json')
  if (!existsSync(config) || declaresInbox(projectDir)) return undefined

  const packageDir = realpathSync(options.inboxPackageDir)
  await linkPackage(projectDir, packageDir)

  const dir = join(runtimeDir, 'inbox-capture')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'inbox-capture.wiring.ts'), WIRING)
  const overlay = join(runtimeDir, 'inbox-capture.pikku.config.json')
  await writeFile(
    overlay,
    JSON.stringify({ extends: relative(runtimeDir, config), srcDirectories: ['./inbox-capture'] }, null, 2),
  )
  return { overlay, packageDir }
}
