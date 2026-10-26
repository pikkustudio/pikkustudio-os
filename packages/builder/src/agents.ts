import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Agent {
  /** Message key for the agent's name. */
  title: string
  /** Message key for what the agent does. */
  description: string
  /** The static part of the agent's system prompt. */
  instructions: string
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const agentsDir = () => process.env.PIKKU_BUILDER_AGENTS ?? join(root, 'agents')

/** Parses `agents/<name>.md`: simple `key: value` frontmatter, then the instructions (one paragraph per line, joined with a space). */
export function parseAgent(text: string): Agent {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!match) throw new Error('An agent file starts with a --- frontmatter block')
  const meta: Record<string, string> = {}
  for (const line of match[1]!.split(/\r?\n/)) {
    const at = line.indexOf(':')
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  if (!meta.title || !meta.description) throw new Error('An agent file needs a title and a description')
  const instructions = match[2]!
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
  return { title: meta.title, description: meta.description, instructions }
}

export const loadAgent = (name: string): Agent => parseAgent(readFileSync(join(agentsDir(), `${name}.md`), 'utf8'))

export interface LinkedAddon {
  /** The addon's short name, `studio.addon` in its package.json: what a screen's `addon` field says. */
  addon: string
  /** Its package directory. */
  dir: string
}

const NAME = /^[a-z][a-z0-9-]*$/

/** The addons the host links (.studio-addons/addons.json, found upward from `from`, or PIKKU_STUDIO_ADDONS_FILE). */
export function linkedAddons(from = process.cwd()): LinkedAddon[] {
  let file = process.env.PIKKU_STUDIO_ADDONS_FILE
  for (let dir = resolve(from); !file; dir = dirname(dir)) {
    if (existsSync(join(dir, '.studio-addons', 'addons.json'))) file = join(dir, '.studio-addons', 'addons.json')
    else if (dirname(dir) === dir) return []
  }
  if (!existsSync(file)) return []
  const base = process.env.PIKKU_STUDIO_ADDONS_FILE ? dirname(file) : dirname(dirname(file))
  const found: LinkedAddon[] = []
  try {
    for (const entry of JSON.parse(readFileSync(file, 'utf8')).addons ?? []) {
      const dir = isAbsolute(entry.dir) ? entry.dir : resolve(base, entry.dir)
      const addon = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).studio?.addon
      if (typeof addon === 'string') found.push({ addon, dir })
    }
  } catch {
    return found
  }
  return found
}

/** A file inside an addon's package, or null: names are plain, and nothing outside the package directory is ever read. */
export function addonAgentPath(addon: string, name: string, addons: LinkedAddon[] = linkedAddons()): string | null {
  if (!NAME.test(addon) || !NAME.test(name)) return null
  const pkg = addons.find((a) => a.addon === addon)?.dir
  if (!pkg) return null
  const path = join(pkg, 'agents', `${name}.md`)
  try {
    const real = realpathSync(path)
    const inside = relative(realpathSync(pkg), real)
    return inside && !inside.startsWith('..') && !isAbsolute(inside) ? real : null
  } catch {
    return null
  }
}

/** Reads `agents/<name>.md` from a linked addon's package. */
export function loadAddonAgent(addon: string, name: string, addons?: LinkedAddon[]): Agent {
  const path = addonAgentPath(addon, name, addons)
  if (!path) throw new Error(`The ${addon} addon has no agent ${name}`)
  return parseAgent(readFileSync(path, 'utf8'))
}
