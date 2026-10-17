import { useContext, useEffect, useState } from 'react'
import { ProjectAgentApiCtx } from './chat'
import { useProjectAction, useProjectQuery } from './projectRpc'

export type FindingSeverity = 'error' | 'warn' | 'info'
export type Finding = { id: string; severity: FindingSeverity; message: string; step: string; file?: string; line?: number; code?: string; hint?: string }
export type VerifyState = { running: boolean; result: { ok: boolean; startedAt: string; durationMs: number; findings: Finding[] } | null }

export type RunStatus = 'running' | 'passed' | 'failed'
export type RunSummary = { runId: string; status: RunStatus; startedAt: string; finishedAt?: string; passed: number; failed: number; skipped: number; artifacts: number; surface: string; environment: string }
export type Artifact = { scenario: string; kind: 'screenshot' | 'failure' | 'video'; path: string; virtualUser?: string; name?: string }
export type Step = { sentence: string; sentenceWithRole?: string; status: string; error?: string }
export type ScenarioResult = {
  name: string
  status: RunStatus
  durationMs: number
  error?: string
  steps?: Step[]
  failure?: { sentence?: string; message: string; stack?: string; expected?: boolean }
  title?: string
  description?: string
  feature?: string
  virtualUsers?: string[]
  artifacts?: Artifact[]
}
export type RunRecord = { runId: string; status: RunStatus; startedAt: string; finishedAt?: string; results: ScenarioResult[]; skipped: { name: string; reason: string }[]; hookFailures: string[] }
export type Coverage = {
  api: { pct: number; covered: number; total: number } | null
  mutations: { required: number; covered: number; uncovered: { id: string; sourceFile?: string }[] }
  routes: { visited: string[]; total: number | null; unvisited: string[] | null }
}

const POLL_MS = 2500

/** Walk-through names come from the project's own code, so they are not ours to translate. */
export const plainName = (name: string) => {
  const spaced = name.replace(/Scenario$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.:]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const titleOf = (r: ScenarioResult) => r.title?.trim() || plainName(r.name)

export const isProblem = (f: Finding) => f.severity !== 'info'

export function useChecks(key: string) {
  const [pollVerify, setPollVerify] = useState(false)
  const [pollRuns, setPollRuns] = useState(false)
  const verify = useProjectQuery<VerifyState>(key, 'console:getVerifyResults', {}, { refetchInterval: pollVerify ? POLL_MS : undefined })
  const runs = useProjectQuery<RunSummary[]>(key, 'console:listScenarioRuns', { limit: 20 }, { refetchInterval: pollRuns ? POLL_MS : undefined })
  const latestId = runs.data?.[0]?.runId
  const latest = useProjectQuery<RunRecord | null>(key, 'console:getScenarioRun', { runId: latestId }, { enabled: !!latestId, refetchInterval: pollRuns ? POLL_MS : undefined })
  const coverage = useProjectQuery<Coverage>(key, 'console:getScenarioCoverage', {}, { optional: true })
  const runVerify = useProjectAction<Record<string, never>>(key, 'console:runVerify', ['console:getVerifyResults'])
  const anyRunning = !!runs.data?.some((r) => r.status === 'running')
  useEffect(() => setPollVerify(!!verify.data?.running || runVerify.isPending), [verify.data?.running, runVerify.isPending])
  useEffect(() => setPollRuns(anyRunning), [anyRunning])
  return { verify, runs, latest, coverage, runVerify }
}

export function useRun(key: string, runId: string) {
  const [poll, setPoll] = useState(false)
  const run = useProjectQuery<RunRecord | null>(key, 'console:getScenarioRun', { runId }, { refetchInterval: poll ? POLL_MS : undefined })
  useEffect(() => setPoll(run.data?.status === 'running'), [run.data?.status])
  const remove = useProjectAction<{ runId: string }>(key, 'console:deleteScenarioRun', ['console:listScenarioRuns', 'console:getScenarioRun'])
  return { run, remove }
}

export type ArtifactSource = { url?: string; failed: boolean; loading: boolean }

/**
 * The picture or recording as an object URL. Fetched rather than linked: the project's route is
 * signed-in, and an <img src> on another origin does not carry the session.
 */
export function useArtifact(key: string, runId: string, path: string): ArtifactSource {
  const agentApi = useContext(ProjectAgentApiCtx)
  const base = agentApi(key).replace(/\/rpc\/agent$/, '')
  const [source, setSource] = useState<ArtifactSource>({ failed: false, loading: true })
  useEffect(() => {
    let url: string | undefined
    let cancelled = false
    setSource({ failed: false, loading: true })
    fetch(`${base}/scenario-run/${encodeURIComponent(runId)}/artifact?path=${encodeURIComponent(path)}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSource({ url, failed: false, loading: false })
      })
      .catch(() => !cancelled && setSource({ failed: true, loading: false }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [base, runId, path])
  return source
}
