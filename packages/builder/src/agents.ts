import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
