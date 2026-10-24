import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)

export type MockRunner = (cwd: string, args: string[]) => Promise<string>

export interface StubUse {
  rpc: string
  file: string
  flag: string | null
}

export interface MockStatus {
  available: boolean
  flagged: StubUse[]
  unflagged: StubUse[]
  changed: string[]
  dead: string[]
  unused: string[]
  screens: number
}

type Check = { calls?: { file: string; rpc?: string; flag?: string; problem?: string }[]; dead?: string[]; unused?: string[] }
type Diff = { rpcs?: { rpc: string; status: string }[] }

export const runMocks: MockRunner = async (cwd, args) => {
  const result = await exec('npx', ['pikku', ...args, '--json'], { cwd, maxBuffer: 8 << 20, timeout: 60_000 }).catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? '' }))
  return result.stdout
}

export const parseMocksOutput = <T>(out: string): T | null => {
  for (const line of out.trim().split('\n').reverse()) {
    try {
      const value = JSON.parse(line)
      if (value && typeof value === 'object') return value as T
    } catch {}
  }
  return null
}

export const NO_MOCKS: MockStatus = { available: false, flagged: [], unflagged: [], changed: [], dead: [], unused: [], screens: 0 }

export async function readMockStatus(cwd: string, runner: MockRunner = runMocks): Promise<MockStatus> {
  const [checkOut, diffOut] = await Promise.all([runner(cwd, ['mocks', 'check']), runner(cwd, ['mocks', 'diff'])])
  const check = parseMocksOutput<Check>(checkOut)
  const diff = parseMocksOutput<Diff>(diffOut)
  if (!check || !diff || !Array.isArray(check.calls) || !Array.isArray(diff.rpcs)) return NO_MOCKS
  const uses = check.calls.filter((c) => c.rpc).map((c) => ({ rpc: c.rpc!, file: c.file, flag: c.flag ?? null, problem: c.problem }))
  const isUnflagged = (u: { flag: string | null; problem?: string }) => !u.flag || u.problem === 'no-flag' || u.problem === 'flag-not-literal'
  const strip = ({ rpc, file, flag }: StubUse): StubUse => ({ rpc, file, flag })
  return {
    available: true,
    flagged: uses.filter((u) => !isUnflagged(u)).map(strip),
    unflagged: uses.filter(isUnflagged).map(strip),
    changed: diff.rpcs.filter((r) => r.status === 'changed' || r.status === 'invalid').map((r) => r.rpc),
    dead: check.dead ?? [],
    unused: check.unused ?? [],
    screens: new Set(uses.map((u) => u.file)).size,
  }
}

type PublishCheck = { ok?: boolean; calls?: { file: string; rpc?: string; problem?: string }[] }

export async function publishBlockers(cwd: string, runner: MockRunner = runMocks): Promise<string | null> {
  const check = parseMocksOutput<PublishCheck>(await runner(cwd, ['mocks', 'check']))
  if (!check || !Array.isArray(check.calls) || check.ok !== false) return null
  const files = [...new Set(check.calls.filter((c) => c.problem).map((c) => c.file))]
  const where = files.length ? `: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` and ${files.length - 5} more` : ''}` : ''
  return `Some screens still show sample data that is not ready to publish${where}. Give each one a feature flag or build what it needs, then publish again.`
}
