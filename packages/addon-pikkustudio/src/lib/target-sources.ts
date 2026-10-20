import { z } from 'zod'
import { sourceOf, type StudioProjectsService } from '../services/projects.js'
import { LOCAL_WORKSPACE, TargetNotAvailableError, sourceKindOf, type SourceContext, type SourceKind, type TargetRef } from '../services/log-source.js'

export const TargetSchema = z.object({ kind: z.enum(['workspace', 'stage']), name: z.string() })

export const SourceKindSchema = z.enum(['workspace', 'sandbox', 'stage'])

/** The source that holds a project and its id there: named in a source key, or the source a local copy is linked to. */
export const sourceProjectOf = async (projects: Pick<StudioProjectsService, 'list'>, key: string): Promise<{ source: string; sourceId: string } | null> => {
  const ref = sourceOf(key)
  if (ref) return { source: ref.source, sourceId: ref.id }
  const listed = (await projects.list().catch(() => [])).find((p) => p.key === key)
  return listed?.source && listed.sourceId ? { source: listed.source, sourceId: listed.sourceId } : null
}

/** The project a host's stage sources are asked about; null where the project has no copy in a source. */
export const stageContext = async (projects: Pick<StudioProjectsService, 'list'>, key: string, session: unknown) => {
  const project = await sourceProjectOf(projects, key)
  return project ? { key, session, project } : null
}

/** Who and what a source is asked about. The account project id is only looked up for kinds the account host holds. */
export const sourceContext = async (projects: Pick<StudioProjectsService, 'list'>, key: string, target: TargetRef, session: unknown): Promise<SourceContext> => {
  if (sourceKindOf(target) === 'workspace') return { key, target, session }
  return { key, target, session, project: (await sourceProjectOf(projects, key)) ?? { source: null, sourceId: null } }
}

/**
 * The source for a target, or what to do instead. A source key is a project this computer does not hold:
 * without a sandbox source its own workspace is asked, as before sources existed.
 */
export const pickSource = <T>(sources: Partial<Record<SourceKind, T>> | undefined, key: string, target: TargetRef): { kind: SourceKind; source: T } | { kind: SourceKind; delegate: true } => {
  const kind = sourceKindOf(target)
  const source = sources?.[kind]
  if (kind === 'workspace' && sourceOf(key)) return { kind, delegate: true }
  if (source) return { kind, source }
  if (kind === 'sandbox' && sourceOf(key)) return { kind, delegate: true }
  throw new TargetNotAvailableError(kind)
}

export const kindsOf = (...all: (Partial<Record<SourceKind, unknown>> | undefined)[]): SourceKind[] => {
  const kinds = new Set<SourceKind>()
  for (const sources of all) for (const kind of Object.keys(sources ?? {}) as SourceKind[]) if (sources?.[kind]) kinds.add(kind)
  return (['workspace', 'sandbox', 'stage'] as const).filter((k) => kinds.has(k))
}

export const LOCAL_TARGET: TargetRef = { kind: 'workspace', name: LOCAL_WORKSPACE }
