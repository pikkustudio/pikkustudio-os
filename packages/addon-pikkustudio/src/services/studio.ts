import type { ScopedSource } from '../lib/sources/index.js'
export { deriveChecklist, guideContext, allowed, classifyActivity, latestActivity, STEP_IDS, DIRECTIONS, BUILD_MINUTES } from '../lib/project-checklist.js'
export type { Checklist, ChecklistStep, StepState, StepAction, Signals, Activity, ActivityKind, RunState } from '../lib/project-checklist.js'
export { languageRule } from './language.js'
export { readSignals } from './project-signals.js'
export { QUESTIONS, type ChecklistStepId, type Intake } from './projects.js'
export { vaultPersonalSource, personalKey } from '../lib/sources/file-sources.js'
export { leased } from '../lib/sources/lease.js'
export type { ScopedSource } from '../lib/sources/cascade.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BuilderSession } from '@pikkustudio/builder'
import { StudioAi } from './ai.js'
import { StudioHooks } from './hooks.js'
import { LogCollector, forwardFromEnv } from './log-collector.js'
import { memoryLogStore, type LogStore } from './log-store.js'
import { STUDIO_KEY, StudioProjectsService, studioHome, type AccountProvider, type ProjectStore } from './projects.js'
import { StudioPublisher, type PublishTarget } from './publish.js'
import { StudioSettingsFile } from './settings.js'

export interface StudioServices {
  home: string
  studioAi: StudioAi
  studioProjects: StudioProjectsService
  studioPublisher: StudioPublisher
  studioBuilder: BuilderSession
  studioSettings: StudioSettingsFile
  studioHooks: StudioHooks
  studioModels: Map<string, string>
  studioLogs: LogStore
}

export interface StudioServicesOptions {
  home?: string
  designEntry?: string
  projects?: StudioProjectsService
  publisher?: StudioPublisher
  publishTargets?: PublishTarget[]
  account?: AccountProvider
  builder?: BuilderSession
  projectEnv?: (key: string) => Promise<Record<string, string>>
  personalSource?: (projectId: string) => ScopedSource | undefined
  teamSource?: (projectId: string, projectPath: string) => ScopedSource | undefined
  projectStore?: ProjectStore
  logStore?: LogStore
}

const resolveDesignEntry = () => {
  try {
    const entry = fileURLToPath(import.meta.resolve('@pikkustudio/design-server'))
    return existsSync(entry) ? entry : undefined
  } catch {
    return undefined
  }
}

const instances = new Map<string, StudioServices>()

export const resetStudioServices = (home?: string) => {
  if (home) instances.delete(home)
  else instances.clear()
}

export async function createStudioServices(options: StudioServicesOptions = {}): Promise<StudioServices> {
  const home = options.home ?? studioHome()
  const existing = instances.get(home)
  if (existing) return existing
  const studioAi = new StudioAi(home)
  const studioProjects =
    options.projects ??
    new StudioProjectsService({
      home,
      account: options.account,
      currentRoot: process.env.PIKKU_STUDIO_PROJECT || null,
      pinned: Boolean(process.env.PIKKU_STUDIO_PROJECT),
      designEntry: options.designEntry ?? resolveDesignEntry(),
      store: options.projectStore,
      personalSource: options.personalSource,
      teamSource: options.teamSource,
      owner: async () => (await new StudioSettingsFile(join(home, 'settings.json')).read()).name ?? '',
      env: async (key) => ({ ...(await studioAi.env()), ...((await options.projectEnv?.(key)) ?? {}) }),
    })
  const studioModels = new Map<string, string>()
  const studioBuilder =
    options.builder ??
    new BuilderSession(async (key, mode) => {
      const env = await studioAi.env()
      const proxyUrl = process.env.PIKKU_BUILDER_PROXY_URL
      const proxyKey = process.env.PIKKU_BUILDER_PROXY_KEY
      const cloud =
        proxyUrl && proxyKey
          ? { proxyUrl, apiKey: proxyKey }
          : env.PIKKU_STUDIO_AI === 'fabric'
            ? await studioProjects.modelAccess()
            : null
      const litellm =
        env.PIKKU_STUDIO_AI_PROVIDER === 'litellm' && env.PIKKU_STUDIO_AI_BASE_URL
          ? { proxyUrl: `${env.PIKKU_STUDIO_AI_BASE_URL.replace(/\/+$/, '')}/v1`, apiKey: env.PIKKU_STUDIO_AI_KEY ?? 'none' }
          : null
      if (!cloud && !env.PIKKU_STUDIO_AI) throw new Error('Choose your AI before building')
      const launch = await studioProjects.builderLaunch(key, mode)
      return {
        ...launch,
        ai: litellm
          ? {
              model: studioModels.get(key) ?? env.PIKKU_STUDIO_MODEL,
              proxy: { url: litellm.proxyUrl, key: litellm.apiKey },
            }
          : cloud
          ? {
              model: studioModels.get(key) ?? process.env.PIKKU_STUDIO_MODEL ?? env.PIKKU_STUDIO_MODEL ?? 'deepseek-v4.1-flash',
              proxy: { url: cloud.proxyUrl, key: cloud.apiKey },
            }
          : { provider: env.PIKKU_STUDIO_AI_PROVIDER, model: studioModels.get(key) ?? env.PIKKU_STUDIO_MODEL },
        env: { ...launch.env, ...env, PIKKU_DEV_LOG: studioProjects.latestLog(key) },
      }
    }, join(home, 'builder'))
  const studioLogs = options.logStore ?? memoryLogStore()
  new LogCollector(home, studioLogs, async () => [...(await studioProjects.list()).map((p) => p.key), STUDIO_KEY], forwardFromEnv(), () => studioProjects.runDirs()).start()
  const services: StudioServices = {
    home,
    studioAi,
    studioProjects,
    studioPublisher: options.publisher ?? new StudioPublisher(studioProjects, options.publishTargets),
    studioBuilder,
    studioSettings: new StudioSettingsFile(join(home, 'settings.json')),
    studioHooks: new StudioHooks(),
    studioModels,
    studioLogs,
  }
  instances.set(home, services)
  return services
}

export { LOCAL_TEAM, studioHome } from './projects.js'
export { StudioSettingsFile } from './settings.js'
export { StudioAi } from './ai.js'
export { StudioProjectsService, fileProjectStore } from './projects.js'
export { kyselyProjectStore } from './project-store.js'
export { kyselyLogStore } from './log-store.js'
export type { ProjectStore, RegistryEntry } from './projects.js'
export { StudioPublisher } from './publish.js'
export type { PublishTarget, Runner } from './publish.js'
export type { AccountProvider, CloudProject, StudioAccount } from './projects.js'
export { StudioHooks } from './hooks.js'
export type { SignInChoice, StudioSettings } from './settings.js'
export type { BuilderSession }
