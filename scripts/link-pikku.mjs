import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, symlinkSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pikku = resolve(process.env.PIKKU_DIR ?? join(root, '..', 'pikku'))
if (!existsSync(join(pikku, 'package.json'))) {
  console.error(`No pikku checkout at ${pikku}. Set PIKKU_DIR.`)
  process.exit(1)
}

const sources = new Map()
const walk = (dir, depth) => {
  if (depth > 3) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    const manifest = join(path, 'package.json')
    if (existsSync(manifest)) {
      const name = JSON.parse(readFileSync(manifest, 'utf8')).name
      if (name?.startsWith('@pikku/')) sources.set(name, path)
    }
    walk(path, depth + 1)
  }
}
walk(join(pikku, 'packages'), 0)

let linked = 0
for (const dir of [join(root, 'node_modules', '@pikku')]) {
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    const source = sources.get(`@pikku/${name}`)
    if (!source) continue
    if (existsSync(join(root, 'packages', name, 'package.json'))) continue
    const target = join(dir, name)
    if (lstatSync(target).isSymbolicLink() || existsSync(target)) rmSync(target, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    symlinkSync(source, target)
    linked++
  }
}
console.log(`Linked ${linked} @pikku packages from ${pikku}`)
