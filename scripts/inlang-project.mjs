// Prints the inlang project the Studio app compiles: the copy scripts/gen-addons.mjs wrote with the linked addons'
// messages, or the committed one for the open build. Run from apps/studio; the path is relative to it.
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const inlangProject = (appDir) => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const linked = join(root, '.studio-addons/project.inlang')
  return existsSync(join(linked, 'settings.json')) ? './' + relative(appDir, linked) : './project.inlang'
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(inlangProject(process.cwd()))
