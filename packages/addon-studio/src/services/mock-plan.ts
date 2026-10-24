import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseMocksOutput, runMocks, type MockRunner } from './mock-status.js'

export interface AddedRpc {
  rpc: string
  scenarios: string[]
}

export interface ProblemRpc {
  rpc: string
  reason: string
}

export interface MockPlan {
  available: boolean
  added: AddedRpc[]
  changed: ProblemRpc[]
  invalid: ProblemRpc[]
}

type Report = {
  rpc: string
  status: string
  changes?: { path: string; kind: string; mock?: string[]; fn?: string[] }[]
  drift?: unknown[]
  unsynced?: boolean
  invalid?: { mock: string; errors: string[] }[]
  problems?: string[]
}

const NONE: MockPlan = { available: false, added: [], changed: [], invalid: [] }

const kinds = (list?: string[]) => (list?.length ? list.join(' or ') : 'something else')

const explainChanged = (r: Report): string => {
  const c = r.changes?.[0]
  if (c?.kind === 'retyped') return `"${c.path}" is ${kinds(c.mock)} in the sample data but ${kinds(c.fn)} in the real function.`
  if (c?.kind === 'mock-only') return `The sample data has "${c.path}", which the real function does not give back.`
  if (c?.kind === 'function-only') return `The real function gives back "${c.path}", which the sample data does not have.`
  if (r.unsynced) return 'The sample data is new since the last time it was saved as the baseline.'
  return 'The sample data was edited since the last time it was saved as the baseline.'
}

const explainInvalid = (r: Report): string => {
  const first = r.problems?.[0] ?? r.invalid?.[0]?.errors?.[0]
  return first ?? 'A sample data file could not be read.'
}

export async function listScenarios(cwd: string, rpc: string): Promise<string[]> {
  const files = await readdir(join(cwd, '.mocks', rpc.replace(/:/g, '.'))).catch(() => [] as string[])
  return files.filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json')).map((f) => f.slice(0, -'.json'.length)).sort()
}

export async function readMockPlan(
  cwd: string,
  runner: MockRunner = runMocks,
  scenarios: (cwd: string, rpc: string) => Promise<string[]> = listScenarios,
): Promise<MockPlan> {
  const diff = parseMocksOutput<{ rpcs?: Report[] }>(await runner(cwd, ['mocks', 'diff']))
  if (!diff || !Array.isArray(diff.rpcs)) return NONE
  const added = await Promise.all(diff.rpcs.filter((r) => r.status === 'added').map(async (r) => ({ rpc: r.rpc, scenarios: await scenarios(cwd, r.rpc) })))
  return {
    available: true,
    added,
    changed: diff.rpcs.filter((r) => r.status === 'changed').map((r) => ({ rpc: r.rpc, reason: explainChanged(r) })),
    invalid: diff.rpcs.filter((r) => r.status === 'invalid').map((r) => ({ rpc: r.rpc, reason: explainInvalid(r) })),
  }
}
