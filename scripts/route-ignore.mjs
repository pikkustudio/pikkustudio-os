// The core route files a first-party addon's screen replaces (`replaces: true`), as the router generator's
// routeFileIgnorePattern. scripts/gen-addons.mjs lists them in the app's src/nav.gen.json; none means nothing is ignored.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const routeIgnorePattern = (appDir) => {
  const file = join(appDir, 'src/nav.gen.json')
  const ignored = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).ignoredRoutes ?? []) : []
  return ignored.length ? `^(${ignored.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$` : undefined
}
