export interface RuntimeSignal {
  requests: number
  errors: number
  lastRun: number | null
  avgDurationMs: number | null
}

/**
 * What a target actually did in production, keyed by the same function id the
 * meta uses. Evidence rather than inference: a function that throws or crawls
 * is worth a human's attention regardless of how plain its static shape is.
 *
 * A host with no observability returns an empty map and the queue falls back to
 * the static score alone. Signals order the queue; they never cast the verdict,
 * because an error can equally be correct rejection of bad input.
 */
export interface RuntimeSignals {
  read(ref: { projectId: string | null; hours?: number }): Promise<Record<string, RuntimeSignal>>
}
