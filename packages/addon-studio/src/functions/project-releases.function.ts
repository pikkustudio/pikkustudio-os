import { z } from 'zod'
import { NotFoundError } from '@pikku/core/errors'
import { pikkuFunc } from '#pikku/addon/function'
import { stageContext } from '../lib/target-sources.js'

const Stage = z.string().nullable().optional()

const Group = z.object({
  id: z.enum(['functions', 'routes', 'jobs', 'migrations', 'secrets', 'variables', 'parts']),
  items: z.array(z.object({ change: z.enum(['added', 'changed', 'removed']), name: z.string() })),
})

const Release = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string().nullable(),
  by: z.string().nullable(),
  at: z.number(),
  liveAt: z.number().nullable(),
  status: z.enum(['live', 'was-live', 'rolled-back', 'failed', 'cancelled', 'working', 'waiting']),
  wait: z.enum(['approval', 'config', 'attention', 'builder']).nullable(),
  failedAt: z.enum(['build', 'tests', 'start', 'publish', 'data']).nullable(),
  reason: z.string().nullable(),
  progress: z.string().nullable(),
  step: z.number(),
  groups: z.array(Group),
  missing: z.array(z.object({ name: z.string(), kind: z.enum(['secret', 'variable']), description: z.string().nullable() })),
})

export const ProjectReleasesInput = z.object({ key: z.string(), stage: Stage })

export const ProjectReleasesOutput = z.object({
  releases: z
    .object({
      place: z.object({ production: z.boolean(), name: z.string() }),
      url: z.string().nullable(),
      releases: z.array(Release),
      pending: z.array(z.object({ id: z.string(), title: z.string(), by: z.string().nullable(), at: z.number() })),
      autoUpdate: z.boolean(),
      canGoBack: z.boolean(),
      moving: z.boolean(),
    })
    .nullable(),
})

export const projectReleases = pikkuFunc({
  expose: true,
  readonly: true,
  description: "A published copy's releases: what went live, what is on its way, and saved work not yet published. Null where this host publishes nothing or the project has no published copy; a stage of null means production.",
  input: ProjectReleasesInput,
  output: ProjectReleasesOutput,
  func: async ({ stageReleases, studioProjects }, { key, stage }, { session }) => {
    const ctx = stageReleases ? await stageContext(studioProjects, key, session) : null
    return { releases: ctx ? await stageReleases!.list(ctx, stage ?? null) : null }
  },
})

export const ProjectReleaseDetailInput = z.object({ key: z.string(), stage: Stage, id: z.string() })

export const ProjectReleaseDetailOutput = z.object({
  detail: z
    .object({
      flags: z.array(
        z.object({
          id: z.string(),
          level: z.enum(['security', 'breaking', 'tests']),
          name: z.string(),
          reason: z.enum(['tests-failed', 'function-removed', 'function-version-removed', 'unit-removed', 'route-removed', 'handler-removed', 'workflow-removed', 'webhook-removed', 'migration-destructive', 'security']),
          text: z.string().optional(),
          count: z.number().optional(),
        }),
      ),
      tests: z.object({ passed: z.number(), failed: z.number(), skipped: z.number() }).nullable(),
      log: z.string().nullable(),
    })
    .nullable(),
})

export const projectReleaseDetail = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'What to know about one release before it goes live: security, breaking and test flags, test results and the build log.',
  input: ProjectReleaseDetailInput,
  output: ProjectReleaseDetailOutput,
  func: async ({ stageReleases, studioProjects }, { key, stage, id }, { session }) => {
    const ctx = stageReleases ? await stageContext(studioProjects, key, session) : null
    return { detail: ctx ? await stageReleases!.detail(ctx, stage ?? null, id) : null }
  },
})

export const ProjectReleasePreviewInput = z.object({ key: z.string(), stage: Stage })

export const ProjectReleasePreviewOutput = z.object({ groups: z.array(Group).nullable() })

export const projectReleasePreview = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'What the next publish would change against what is live. Null when that is not known.',
  input: ProjectReleasePreviewInput,
  output: ProjectReleasePreviewOutput,
  func: async ({ stageReleases, studioProjects }, { key, stage }, { session }) => {
    const ctx = stageReleases ? await stageContext(studioProjects, key, session) : null
    return { groups: ctx ? await stageReleases!.preview(ctx, stage ?? null) : null }
  },
})

export const ProjectReleaseActionInput = z.object({
  key: z.string(),
  stage: Stage,
  act: z.discriminatedUnion('action', [
    z.object({ action: z.enum(['approve', 'dismiss', 'recheck', 'goBack', 'tryAgain']), id: z.string() }),
    z.object({ action: z.literal('fill'), kind: z.enum(['secret', 'variable']), name: z.string(), value: z.string() }),
    z.object({ action: z.literal('autoUpdate'), on: z.boolean() }),
  ]),
})

export const ProjectReleaseActionOutput = z.object({ allClear: z.boolean() })

export const projectReleaseAction = pikkuFunc({
  expose: true,
  description: 'Act on a published copy: approve, dismiss or recheck a release, fill in what it is missing, go back to an earlier one, publish again, or turn automatic updates on or off.',
  input: ProjectReleaseActionInput,
  output: ProjectReleaseActionOutput,
  func: async ({ stageReleases, studioProjects }, { key, stage, act }, { session }) => {
    const ctx = stageReleases ? await stageContext(studioProjects, key, session) : null
    if (!ctx) throw new NotFoundError('This project has no published copy here')
    return stageReleases!.act(ctx, stage ?? null, act)
  },
})
