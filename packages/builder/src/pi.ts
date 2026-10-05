import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface BuilderAi {
  provider?: string
  model?: string
  proxy?: { url: string; key: string }
}

export const EXTENSIONS = ['proxy-provider.mjs', 'codegen-diagnostics.mjs', 'edit-files-extension.mjs', 'write-files-extension.mjs', 'navigate-extension.mjs', 'heal-report-extension.mjs']

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const extensionsDir = () => process.env.PIKKU_BUILDER_EXTENSIONS ?? join(packageRoot, 'extensions')

export const extensionPaths = () => EXTENSIONS.map((name) => join(extensionsDir(), name))

export const SYSTEM_PROMPT = [
  'You are building a pikku app in the current directory.',
  'Before writing code for a part of the app, read the pikku skill for it (pikku-build first).',
  'Write code the way the skills show, keep generated files (.pikku/, *.gen.*) untouched,',
  'and check your work with `pikku all` once a batch of changes is done.',
  'For one-off scripts use bun. When a Python library is the better tool (images, data, a Blender scene),',
  'run it with `uv run --no-project --with <package> script.py`: uv brings its own Python, so none needs installing.',
  'Keep such scripts out of the app source.',
  'Work arrives as changes, grouped into changesets: `pikku changes next` picks the work and the builder hands it to you.',
  'Build one changeset, commit each change on its own, mark it done and stop; the builder merges it and starts the next.',
].join(' ')

export type BuilderMode = 'build' | 'prototype' | 'artifacts' | 'knowledge'

export const MODE_PROMPTS: Record<Exclude<BuilderMode, 'build'>, string> = {
  prototype: [
    'You are working on the prototype of an app, not the real app.',
    'Each app in apps/ has its own prototype beside it, in apps/<app>-prototype. Write only there, and nowhere else: the rest of the project is read-only for you.',
    'The prototype has no real backend. Make up believable mock data inside the prototype so every screen looks lived in.',
    'You may read the real app to match what it does, but never change it, and never file or suggest changes to it.',
  ].join(' '),
  artifacts: [
    'You are making artifacts for the owner: designs, pages and documents, in artifacts/. Write only there; the rest of the project is read-only for you.',
    'Read the pikku-artifacts skill first and follow it for the kind of artifact you are making.',
    'You never change the app itself, and you never file or suggest changes to it.',
  ].join(' '),
  knowledge: [
    'You look after the knowledge base in knowledge/, which says what the product is and does. Write only there; the rest of the project is read-only for you.',
    'Read the pikku-knowledge skill first. You have three jobs.',
    'Interview: ask the owner one plain product question at a time, the way a product manager draws out a feature list, and write each answer into the knowledge as it grows what the app does.',
    'Answer open questions: work through the questions recorded in the knowledge. Answer what the rest of the knowledge already settles, and ask the owner only what needs their call.',
    'Maintain: keep notes consistent, merge duplicates, retire what the app no longer does, and run `pikku knowledge validate`.',
    'Say in plain words what you added or tidied.',
  ].join(' '),
}

const PROVIDERS: Record<string, string> = { gemini: 'google' }

export const EXPLORE_PROMPT = [
  'You are exploring design directions for an app the owner has described.',
  'Use the impeccable skill for every design decision. Do not read the project or any other files first.',
  'Write only the files you are asked to write, and do not change the app.',
].join(' ')

export const impeccableSkill = () => {
  const found = [process.env.PIKKU_IMPECCABLE_SKILL, join(homedir(), '.claude', 'skills', 'impeccable')].find((path) => path && existsSync(join(path, 'SKILL.md')))
  if (!found) throw new Error('The design skill is not installed on this computer')
  return found
}

export function piArgs(options: { ai?: BuilderAi; skills: string; mode?: 'rpc'; session?: string; explore?: boolean; scope?: BuilderMode }): string[] {
  const args: string[] = []
  if (options.mode) args.push('--mode', options.mode)
  if (options.explore) args.push('--approve', '--no-skills', '--no-context-files', '--skill', impeccableSkill(), '--append-system-prompt', EXPLORE_PROMPT)
  else args.push('--approve', '--skill', options.skills, '--append-system-prompt', options.scope && options.scope !== 'build' ? `${SYSTEM_PROMPT} ${MODE_PROMPTS[options.scope]}` : SYSTEM_PROMPT)
  for (const path of extensionPaths()) args.push('-e', path)
  if (options.session) args.push('--session-id', options.session)
  if (options.ai?.proxy) args.push('--provider', 'pikku-proxy')
  else if (options.ai?.provider) args.push('--provider', PROVIDERS[options.ai.provider] ?? options.ai.provider)
  if (options.ai?.model) args.push('--model', options.ai.model)
  return args
}

export const piEnv = (ai?: BuilderAi): Record<string, string> =>
  ai?.proxy && ai.model
    ? { PIKKU_BUILDER_PROXY_URL: ai.proxy.url, PIKKU_BUILDER_PROXY_KEY: ai.proxy.key, PIKKU_BUILDER_PROXY_MODEL: ai.model }
    : {}

export function packageDir(name: string): string {
  let dir = dirname(fileURLToPath(import.meta.resolve(name)))
  while (!existsSync(join(dir, 'package.json'))) dir = dirname(dir)
  return dir
}

export function resolvePi(): string {
  const dir = piPackageRoot()
  const bin = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).bin
  const relative = typeof bin === 'string' ? bin : bin?.pi
  if (!relative) throw new Error('The installed pi has no command to run')
  return join(dir, relative)
}

export const piPackageRoot = () => process.env.PIKKU_PI_ROOT ?? packageDir('@earendil-works/pi-coding-agent')
