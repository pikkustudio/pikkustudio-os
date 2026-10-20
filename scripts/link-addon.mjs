// Wires the private Studio addons into this checkout, the way link-pikku.mjs wires a pikku checkout: a symlink in
// node_modules, so bun.lock never changes. The addons live in one private monorepo, checked out at
// packages/pikkustudio-private (a submodule with update = none), one addon per packages/<name>. They are not
// workspaces (package.json negates the submodule) and list only optional peers, so everything they import resolves
// from this repo's node_modules. When the submodule is not checked out (an empty folder) no addon is found, which is
// what keeps the open build working without it.
//
//   node scripts/link-addon.mjs             wire every addon present, with pikku.cloud.json
//   node scripts/link-addon.mjs --operator  also wire the operator addons, with pikku.operator.json
//   node scripts/link-addon.mjs --test      only the local test addons (packages/addons/spindle and diffui), to try the
//                                          addon screens and nav across more than one addon; never part of the app
//   node scripts/link-addon.mjs --unlink    back to the open build
//
// Each addon's wire/*.ts is copied to .studio-addons/wire/, which pikku.cloud.json lists as a source directory: the
// pikku inspector skips any file under a directory holding its own pikku.config.json, so the addon's own copy is
// never read. The choice is written to .studio-addons/addons.json, which scripts/pikku-config.mjs reads.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const linked = join(root, '.studio-addons')
const stateFile = join(linked, 'addons.json')
const args = new Set(process.argv.slice(2))

// The private monorepo's addons, one per folder.
const PRIVATE = join(root, 'packages/pikkustudio-private/packages')
// The operator addons (by package name) only make sense on top of the cloud one; the open build has neither.
const OPERATOR_ONLY = new Set(['@pikkustudio/addon-controlpanel'])
// Workspace packages already in node_modules: linking them only copies their wire/ files, and unlinking leaves them be.
const TEST_ADDONS = ['packages/addons/spindle', 'packages/addons/diffui']

const unlinkAll = () => {
  if (!existsSync(stateFile)) {
    rmSync(linked, { recursive: true, force: true })
    return 0
  }
  const { addons = [] } = JSON.parse(readFileSync(stateFile, 'utf8'))
  for (const { name, test } of addons) {
    if (test) continue
    const target = join(root, 'node_modules', name)
    if (existsSync(target) || lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) rmSync(target, { recursive: true, force: true })
  }
  rmSync(linked, { recursive: true, force: true })
  return addons.length
}

if (args.has('--unlink')) {
  console.log(`Unlinked ${unlinkAll()} addon(s); the next build is the open one`)
  process.exit(0)
}

const copyWire = (dir) => {
  const wire = join(dir, 'wire')
  if (!existsSync(wire)) return
  mkdirSync(join(linked, 'wire'), { recursive: true })
  for (const file of readdirSync(wire).filter((f) => f.endsWith('.ts'))) copyFileSync(join(wire, file), join(linked, 'wire', file))
}

if (args.has('--test')) {
  unlinkAll()
  const addons = TEST_ADDONS.map((dir) => {
    copyWire(join(root, dir))
    return { name: JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')).name, dir, test: true }
  })
  mkdirSync(linked, { recursive: true })
  writeFileSync(stateFile, JSON.stringify({ config: 'pikku.cloud.json', addons }, null, 2) + '\n')
  console.log(`Linked the test addons ${addons.map((a) => a.name).join(', ')}; builds now use pikku.cloud.json`)
  process.exit(0)
}

const present = (existsSync(PRIVATE) ? readdirSync(PRIVATE, { withFileTypes: true }) : [])
  .filter((e) => e.isDirectory() && existsSync(join(PRIVATE, e.name, 'package.json')))
  .map((e) => join(PRIVATE, e.name))
  .filter((dir) => args.has('--operator') || !OPERATOR_ONLY.has(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name))

if (!present.length) {
  unlinkAll()
  console.log('No private addon is checked out; the build stays the open one')
  process.exit(0)
}

unlinkAll()
const addons = []
for (const dir of present) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  // Its own dependencies, if it ever has any, come from its own lockfile, never this repo's.
  if (Object.keys(manifest.dependencies ?? {}).length) execSync('bun install --frozen-lockfile', { cwd: dir, stdio: 'inherit' })
  const target = join(root, 'node_modules', manifest.name)
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { recursive: true, force: true })
  symlinkSync(relative(dirname(target), dir), target)
  copyWire(dir)
  addons.push({ name: manifest.name, dir: relative(root, dir) })
}

const operator = args.has('--operator') && existsSync(join(root, 'pikku.operator.json'))
const config = operator ? 'pikku.operator.json' : 'pikku.cloud.json'
mkdirSync(linked, { recursive: true })
writeFileSync(stateFile, JSON.stringify({ config, addons }, null, 2) + '\n')
console.log(`Linked ${addons.map((a) => a.name).join(', ')}; builds now use ${config}`)
