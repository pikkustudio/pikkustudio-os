import { z } from 'zod'
import type { StudioProjectsService } from '../services/projects.js'
import { LOCAL_WORKSPACE, TargetNotAvailableError, sourceKindOf, type SourceContext, type SourceKind, type TargetRef } from '../services/log-source.js'

export const TargetSchema = z.object({ kind: z.enum(['workspace', 'stage']), name: z.string() })

export const SourceKindSchema = z.enum(['workspace', 'sandbox', 'stage'])

const cloudIdOf = (key: string) => (key.startsWith('cloud:') ? key.slice('cloud:'.length).split('@')[0] || null : null)

/** Who and what a source is asked about. The cloud project id is only looked up for kinds that live in the cloud. */
export const sourceContext = async (projects: Pick<StudioProjectsService, 'list'>, key: string, target: TargetRef, session: unknown): Promise<SourceContext> => {
  if (sourceKindOf(target) === 'workspace') return { key, target, session }
  const cloudProjectId = cloudIdOf(key) ?? (await projects.list().catch(() => [])).find((p) => p.key === key)?.cloudProjectId ?? null
  return { key, target, session, project: { cloudProjectId } }
}

/**
 * The source for a target, or what to do instead. A `cloud:` key is a project this computer does not hold:
 * without a sandbox source its own workspace is asked, as before sources existed.
 */
export const pickSource = <T>(sources: Partial<Record<SourceKind, T>> | undefined, key: string, target: TargetRef): { kind: SourceKind; source: T } | { kind: SourceKind; delegate: true } => {
  const kind = sourceKindOf(target)
  const source = sources?.[kind]
  if (kind === 'workspace' && key.startsWith('cloud:')) return { kind, delegate: true }
  if (source) return { kind, source }
  if (kind === 'sandbox' && key.startsWith('cloud:')) return { kind, delegate: true }
  throw new TargetNotAvailableError(kind)
}

export const kindsOf = (...all: (Partial<Record<SourceKind, unknown>> | undefined)[]): SourceKind[] => {
  const kinds = new Set<SourceKind>()
  for (const sources of all) for (const kind of Object.keys(sources ?? {}) as SourceKind[]) if (sources?.[kind]) kinds.add(kind)
  return (['workspace', 'sandbox', 'stage'] as const).filter((k) => kinds.has(k))
}

export const LOCAL_TARGET: TargetRef = { kind: 'workspace', name: LOCAL_WORKSPACE }
