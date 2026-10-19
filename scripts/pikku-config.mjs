// Prints the `--config` argument for the pikku CLI: the addon config link-addon.mjs chose, or nothing for the open
// build. Used as `pikku all $(node scripts/pikku-config.mjs)`, from any directory.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const state = join(root, '.studio-addons', 'addons.json')
if (existsSync(state)) {
  const { config } = JSON.parse(readFileSync(state, 'utf8'))
  if (config && existsSync(join(root, config))) process.stdout.write(`--config=${join(root, config)}`)
}
