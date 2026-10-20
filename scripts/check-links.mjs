// Build-time link check: every literal path core links to (`to="/..."`, `to: '/...'`, `navigate({ to: '/...' })`) in
// apps/studio/src and packages/pikkustudio-blocks/src, and every path in the nav registry (src/nav.gen.json), must be a
// route in the generated route tree. Runs after gen-routes.mjs; a dead link fails the build, naming file and line.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const app = join(root, 'apps/studio')
const tree = readFileSync(join(app, 'src/routeTree.gen.ts'), 'utf8')
const byTo = tree.slice(tree.indexOf('export interface FileRoutesByTo'))
const routes = [...byTo.slice(0, byTo.indexOf('}')).matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1].split('/').filter(Boolean))

const segs = (path) => path.split(/[?#]/)[0].split('/').filter(Boolean)
const resolves = (path) => {
  const want = segs(path)
  return routes.some((route) => {
    for (let i = 0; i < route.length; i++) {
      if (route[i] === '$') return want.length > i
      if (i >= want.length) return false
      if (!route[i].startsWith('$') && route[i] !== want[i]) return false
    }
    return route.length === want.length
  })
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) walk(file)
    else if (/\.tsx?$/.test(name) && !/\.(test|gen)\.tsx?$/.test(name) && !file.includes('/paraglide/')) files.push(file)
  }
}
walk(join(app, 'src'))
walk(join(root, 'packages/pikkustudio-blocks/src'))

const dead = []
let checked = 0
// A literal path right after `to=` or `to:`: a string, or a template literal with no ${...} in it.
const LINK = /\bto(?:=\{?|:\s*)(?:'(\/[^']*)'|"(\/[^"]*)"|`(\/[^`$]*)`)/g
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LINK)) {
      const path = m[1] ?? m[2] ?? m[3]
      checked++
      if (!resolves(path)) dead.push(`${relative(root, file)}:${i + 1} links to ${path}`)
    }
  })
}

const navFile = join(app, 'src/nav.gen.json')
if (existsSync(navFile)) {
  const nav = JSON.parse(readFileSync(navFile, 'utf8'))
  const asRoute = (path) => path.replace(/:\w+/g, '$x').replace(/\*$/, '$x')
  for (const s of nav.screens) if (!resolves(asRoute(s.path))) dead.push(`nav registry: screen ${s.path}${s.addon ? ` (addon ${s.addon})` : ''} has no route`)
  for (const p of [...nav.pins, ...nav.quickFind, ...nav.explore.flatMap((x) => x.rows)]) if (!resolves(p.path)) dead.push(`nav registry: ${p.path} has no route`)
}

if (dead.length) {
  console.error(`Links to paths no route serves:\n  ${dead.join('\n  ')}`)
  process.exit(1)
}
console.log(`Link check: ${checked} links in ${files.length} files, and the nav registry, resolve to the ${routes.length} routes`)
