import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

export type CommandRunner = (cwd: string, args: string[], env?: Record<string, string>) => Promise<{ code: number; output: string }>

export interface NextRoute {
  agent: 'changes' | 'intake' | 'knowledge' | 'upgrade' | null
  skill: string | null
  specialist?: string | null
  refs: string[]
  reason: string
  context: string | null
  merged: string[]
}

export interface ChangesReport {
  changes: Record<string, unknown>[]
  groups: Record<string, unknown>[]
}

export const pikkuBin = (cwd: string): string[] => {
  if (process.env.PIKKU_CLI_BIN && existsSync(process.env.PIKKU_CLI_BIN)) return [process.env.PIKKU_CLI_BIN]
  try {
    return [process.execPath, createRequire(import.meta.url).resolve('@pikku/cli')]
  } catch {
    for (let dir = cwd; ; dir = dirname(dir)) {
      const bin = join(dir, 'node_modules', '.bin', 'pikku')
      if (existsSync(bin)) return [bin]
      if (dirname(dir) === dir) return ['npx', '--no', 'pikku']
    }
  }
}

export const runPikku: CommandRunner = (cwd, args, env = {}) =>
  new Promise((resolve) => {
    const [command, ...prefix] = pikkuBin(cwd)
    const child = spawn(command!, [...prefix, ...args], { cwd, env: { ...process.env, ...env, FORCE_COLOR: '0' } })
    let output = ''
    child.stdout.on('data', (chunk) => (output = (output + chunk).slice(-200000)))
    child.stderr.on('data', (chunk) => (output = (output + chunk).slice(-200000)))
    child.once('error', (error) => resolve({ code: 1, output: error.message }))
    child.once('close', (code) => resolve({ code: code ?? 1, output }))
  })

async function json<T>(cwd: string, args: string[], run: CommandRunner, env?: Record<string, string>): Promise<T> {
  const { code, output } = await run(cwd, [...args, '--json'], env)
  const line = output.trim().split('\n').findLast((l) => l.startsWith('{'))
  if (!line && /^Usage: pikku <command>/m.test(output)) throw new Error(`The pikku installed here has no \`pikku ${args.slice(0, 2).join(' ')}\` command (it printed its help). The project resolved an older @pikku/cli.`)
  if (code !== 0 || !line) throw new Error(output.trim().split('\n').slice(-8).join('\n') || `pikku ${args[0]} failed (${code})`)
  return JSON.parse(line) as T
}

export const pikkuNext = (cwd: string, prompt?: string, run: CommandRunner = runPikku, env?: Record<string, string>) =>
  json<NextRoute>(cwd, prompt ? ['changes', 'next', '--prompt', prompt] : ['changes', 'next'], run, env)

export const changesReport = (cwd: string, run: CommandRunner = runPikku) =>
  json<ChangesReport>(cwd, ['changes', 'list', '--include-done'], run)

export const routeMessage = (route: NextRoute) =>
  [
    `You are the ${route.agent} agent for this project. Follow the ${route.skill} skill${route.refs.length ? `, and read ${route.refs.join(', ')} before you start` : ''}.`,
    '',
    route.context ?? '',
  ].join('\n')

const MAP_START = 'Search: pikku meta grep'
const MAP_LIMIT = 12000

/** The project map from `pikku meta context`, or '' when this CLI has none to give. */
export const projectMap = async (cwd: string, run: CommandRunner = runPikku, env?: Record<string, string>): Promise<string> => {
  const { code, output } = await run(cwd, ['meta', 'context'], { ...env, PIKKU_NO_LOGO: '1' }).catch(() => ({ code: 1, output: '' }))
  const start = output.indexOf(MAP_START)
  const map = output.slice(start).trim()
  return code === 0 && start >= 0 && map.length <= MAP_LIMIT ? map : ''
}

export const withProjectMap = (message: string, map: string) =>
  map ? `${message}\n\n<project-map>\n${map}\n</project-map>` : message

export const shimsDir = (home: string, queueHome?: string) => join(home, queueHome ? 'bin-local' : 'bin')

/** A project's own CLI wins, so codegen and `pikku doc` match the @pikku/core it has installed. */
const projectCli = `dir=$PWD
while :; do
  if [ -x "$dir/node_modules/.bin/pikku" ]; then exec ${JSON.stringify(process.execPath)} "$dir/node_modules/.bin/pikku" "$@"; fi
  [ "$dir" = / ] && break
  dir=$(dirname "$dir")
done
`

export async function writePikkuShim(home: string, queueHome?: string): Promise<string> {
  const dir = shimsDir(home, queueHome)
  const [command, ...prefix] = pikkuBin(dir)
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'pikku')
  const homeLine = queueHome ? `export HOME=${JSON.stringify(queueHome)}\n` : ''
  const fallback = [command, ...prefix].map((part) => JSON.stringify(part)).join(' ')
  await writeFile(file, `#!/bin/sh\n${homeLine}${projectCli}exec ${fallback} "$@"\n`)
  await chmod(file, 0o755)
  return dir
}

export const OFFER_MARKER = '[[offer:changeset]]'

export const offerMessage = (request: string) =>
  [
    'The owner sent this from the Build screen:',
    '',
    request,
    '',
    'If the request is to create a new app (a new frontend under apps/), it is not a big job to offer or queue: do not explore the project first. Follow the new-app rule in your instructions: ask who the app is for if the owner did not say, then end the reply with the app card line, and do nothing else until it is confirmed.',
    'Otherwise decide how big it is. A small job (a word, a colour, one or two files, a few minutes): just do it now.',
    `A big job (new screens, new data, several features, or more than about ten minutes): do not start. Say in plain words what you would do in a sentence or two, say it is a bigger job, and end that reply with exactly this line on its own: ${OFFER_MARKER}`,
    'Then wait. If the owner is answering an offer you made earlier: when they want it queued, file it with `pikku changes file --title "<the requirement in one line>" --body "<the detail>"` and say it is queued; when they want it now, build it in this session.',
  ].join('\n')
