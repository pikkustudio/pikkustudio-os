import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAgent } from './agents.js'
import { writeDirectionsSkill } from './directions-skill.js'

export interface BuilderAi {
  provider?: string
  model?: string
  proxy?: { url: string; key: string }
}

export const EXTENSIONS = ['proxy-provider.mjs', 'codegen-diagnostics.mjs', 'edit-files-extension.mjs', 'write-files-extension.mjs', 'navigate-extension.mjs', 'heal-report-extension.mjs', 'studio-mcp-extension.mjs']

const WRITE_ONLY_EXTENSIONS = ['studio-mcp-extension.mjs']

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const extensionsDir = () => process.env.PIKKU_BUILDER_EXTENSIONS ?? join(packageRoot, 'extensions')

export const extensionPaths = (role?: 'explore' | 'inspect') =>
  EXTENSIONS.filter((name) => !role || !WRITE_ONLY_EXTENSIONS.includes(name)).map((name) => join(extensionsDir(), name))

export const TALK = [
  'How you talk to the owner: they are not a developer and have never opened a code editor.',
  'Answer in two or three short plain sentences, in the words they use for their own app. Never mention file names, hooks, functions, mocks, types, commands or tools.',
  'Write one message when you are done, not a running commentary: do not narrate your steps.',
  'If the owner only greets you or asks a question, answer it right away without reading the project (apart from any quick check your role names), and ask one plain question about what they want.',
].join(' ')

export const NO_DEPS_RULE = 'Never read inside node_modules or dist folders (package source is not documentation). When you need to know how something works, read AGENTS.md and the skills, run `pikku --help` or the command with --help, or look at an existing file in the project; if that does not answer it, make the simplest choice and say so.'

export const NO_SETUP_RULE = 'Never install anything: no browsers or Playwright, no global packages, no bunx or npx tool you do not already have. Never start a dev server, a second pikku dev or a preview of your own: this project already has its servers running and the owner is looking at them. Browser scenarios use the Chromium Studio already provides (PLAYWRIGHT_CHROMIUM_PATH is set in your environment), so never install one. Check your work with the checks in AGENTS.md (lint, tsc, pikku validate), and when something cannot be checked that way, say so in your last message instead of setting up tooling to check it.'

export const APP_MARKER = '[[app:'

/** The owner asks for a new app: a card they confirm first, and only then `pikku app new`. */
export const APP_RULE = [
  'When the owner asks for a new app (a second frontend, such as a back office), never run `pikku app new` yourself first.',
  'If they did not say who the app is for, ask that first in a card, and wait. The answer is a word of their own: staff, customer, supplier, patient.',
  `Then end the reply with exactly one line, on its own, of the form ${APP_MARKER}{"slug":"<lowercase-kebab-name>","serves":"<who it is for>","label":"<the button in plain words>","why":"<one plain sentence on what it adds>"}]] and stop: the owner confirms it in a card.`,
  'Only when the owner has confirmed, run `pikku app new <slug> --serves <who>` with the default starter template (never --template), add --virtualUsers only after checking defineVirtualUsers, then say where the app is and what it needs next. If they decline, do not create it.',
].join(' ')

/** Read when used, not at import, so a packaged runtime can point PIKKU_BUILDER_AGENTS at its own copy first. */
export const systemPrompt = () => [loadAgent('build').instructions, APP_RULE, NO_DEPS_RULE, NO_SETUP_RULE, TALK].join(' ')

export type BuilderMode = 'build' | 'frontend' | 'artifacts' | 'knowledge' | 'emails' | 'project'

export const SPECIALISTS = ['build', 'frontend', 'artifacts', 'knowledge', 'emails', 'project'] as const

export type Specialist = (typeof SPECIALISTS)[number]

export const specialistFor = (mode: BuilderMode): Specialist => mode

export const slotKey = (key: string, specialist: Specialist = 'build'): string => (specialist === 'build' ? key : `${key}:${specialist}`)

const SLOT_SUFFIX = new RegExp(`:(${SPECIALISTS.filter((s) => s !== 'build').join('|')})$`)

export const projectKey = (key: string): string => key.replace(SLOT_SUFFIX, '')

export const slotSlug = (key: string): string => key.replace(':', '-')

export const ASK_MARKER = '[[ask:'

export const DO_MARKER = '[[do:'

export const QUESTION_LIMIT = 5

export const MODE_PROMPTS: Record<Exclude<BuilderMode, 'build'>, string> = {
  get frontend() {
    return [loadAgent('frontend').instructions, APP_RULE, NO_DEPS_RULE, NO_SETUP_RULE].join(' ')
  },
  get artifacts() {
    return loadAgent('artifacts').instructions
  },
  get knowledge() {
    return loadAgent('knowledge').instructions
  },
  get project() {
    return loadAgent('project').instructions
  },
  get emails() {
    return loadAgent('emails').instructions
  },
}

const PROVIDERS: Record<string, string> = { gemini: 'google' }

export const EXPLORE_PROMPT = [
  'You are exploring design directions for an app the owner has described.',
  'Use the directions skill for every design decision. Do not read the project or any other files first, except files the owner attached, which the request names.',
  'Write the files you are asked to write first, before anything else, and do not change the app. Do not take screenshots, make images or run review commands, and never write outside the project.',
].join(' ')

export const INSPECT_PROMPT = [
  'You look through files an owner attached to a new project and write down what is in them, so designers and builders never need to open the originals.',
  'Read each file named in the request. Write only the notes you are asked to write, in knowledge/attachments/. Do not change anything else.',
].join(' ')

export const impeccableSkill = () => {
  const found = [process.env.PIKKU_IMPECCABLE_SKILL, join(homedir(), '.claude', 'skills', 'impeccable')].find((path) => path && existsSync(join(path, 'SKILL.md')))
  if (!found) throw new Error('The design skill is not installed on this computer')
  return found
}

export const directionsSkill = () => writeDirectionsSkill(impeccableSkill())

export function piArgs(options: { ai?: BuilderAi; skills: string; mode?: 'rpc'; session?: string; role?: 'explore' | 'inspect'; scope?: BuilderMode; briefing?: string }): string[] {
  const args: string[] = []
  if (options.mode) args.push('--mode', options.mode)
  if (options.role === 'inspect') args.push('--approve', '--no-skills', '--no-context-files', '--append-system-prompt', INSPECT_PROMPT)
  else if (options.role) args.push('--approve', '--no-skills', '--no-context-files', '--skill', directionsSkill(), '--append-system-prompt', EXPLORE_PROMPT)
  else args.push('--approve', '--skill', options.skills, '--append-system-prompt', options.scope && options.scope !== 'build' ? [MODE_PROMPTS[options.scope], TALK, options.briefing].filter(Boolean).join('\n\n') : systemPrompt())
  for (const path of extensionPaths(options.role)) args.push('-e', path)
  if (options.session) args.push('--session-id', options.session.replace(/[^A-Za-z0-9_.-]/g, '-'))
  if (options.ai?.proxy) args.push('--provider', 'pikku-proxy')
  else if (options.ai?.provider && options.ai.model) args.push('--provider', PROVIDERS[options.ai.provider] ?? options.ai.provider)
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
