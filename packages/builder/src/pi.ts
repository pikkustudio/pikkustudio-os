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
  'Before you stop, run the checks listed in AGENTS.md and fix every failure.',
].join(' ')

export type BuilderMode = 'build' | 'frontend' | 'artifacts' | 'knowledge' | 'emails'

export const MODE_PROMPTS: Record<Exclude<BuilderMode, 'build'>, string> = {
  frontend: [
    'You are the frontend agent. You work in this app, in the frontend only, so the owner can see and click through screens before the backend exists.',
    'Read the pikku-build skill first, then its mocks reference, and follow AGENTS.md. Write only in apps/ and .mocks/; the rest of the project is read-only for you, and you never write backend functions or database code.',
    'Build real screens from the app components and the theme tokens, every string through m.*(). For data call usePikkuQuery when a function in api.gen.ts fits; when none does, add .mocks/<rpc.name>/ scenarios (a default healthy one, an empty one, an error one), run `pikku all` so the types appear, and call usePikkuQueryStub or usePikkuMutationStub.',
    'Data rules, whatever the skill says: never put sample data in a component, a constant or a message string. Every list, number and name on a screen comes from a hook. If the data has no function, write the mock files first (.mocks/<rpc.name>/healthy.json with its .meta.json, plus empty and error), then call the stub hook. A screen that shows a hardcoded array is wrong even if it looks right.',
    'Never write a feature flag and never borrow one that belongs to something else: leave every stub without a flag. An unflagged stub works while you build and only stops publishing, which is how the owner sees what is not built yet. Never file or suggest changes; a later step turns the stubs into real functions.',
    'Show something fast: the first screen is viewable within a couple of minutes, then fill it out. Say in plain words which parts use sample data.',
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
    'Whenever a question comes up that the owner has not answered yet, record it as a note in knowledge/questions/ with `status: open` in its frontmatter, and set `status: answered` when it is settled. The owner sees the open ones as buttons.',
    'Maintain: keep notes consistent, merge duplicates, retire what the app no longer does, and run `pikku knowledge validate`.',
    'Say in plain words what you added or tidied.',
  ].join(' '),
  emails: [
    'You look after the emails this app sends: the templates, their wording in every language, the shared partials and the theme, all in emails/. Write only there; the rest of the project is read-only for you.',
    'Read the pikku-emails skill first and follow it. After a change run `pikku emails generate` and render the template with sample data to check it.',
    'Write the way the owner talks to their own customers: short, warm and plain, with no jargon. Keep every language of a template in step, and keep the variables a template uses the same unless the owner asks for a new one.',
    'You never change the app itself, and you never file or suggest changes to it. Say in plain words what you changed.',
  ].join(' '),
}

const PROVIDERS: Record<string, string> = { gemini: 'google' }

export const EXPLORE_PROMPT = [
  'You are exploring design directions for an app the owner has described.',
  'Use the impeccable skill for every design decision. Do not read the project or any other files first, except files the owner attached, which the request names.',
  'Write only the files you are asked to write, and do not change the app.',
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

export function piArgs(options: { ai?: BuilderAi; skills: string; mode?: 'rpc'; session?: string; role?: 'explore' | 'inspect'; scope?: BuilderMode }): string[] {
  const args: string[] = []
  if (options.mode) args.push('--mode', options.mode)
  if (options.role === 'inspect') args.push('--approve', '--no-skills', '--no-context-files', '--append-system-prompt', INSPECT_PROMPT)
  else if (options.role) args.push('--approve', '--no-skills', '--no-context-files', '--skill', impeccableSkill(), '--append-system-prompt', EXPLORE_PROMPT)
  else args.push('--approve', '--skill', options.skills, '--append-system-prompt', options.scope && options.scope !== 'build' ? MODE_PROMPTS[options.scope] : SYSTEM_PROMPT)
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
