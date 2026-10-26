import type { GeneratedStore, ScopedSource } from '../lib/sources/index.js'
export { deriveChecklist, guideContext, allowed, classifyActivity, latestActivity, STEP_IDS, DIRECTIONS, BUILD_MINUTES } from '../lib/project-checklist.js'
export type { Checklist, ChecklistStep, StepState, StepAction, Signals, Activity, ActivityKind, RunState } from '../lib/project-checklist.js'
export { languageRule } from './language.js'
export { readSignals } from './project-signals.js'
export { QUESTIONS, EMPTY_INTAKE, type ChecklistStepId, type Intake } from './projects.js'
export { vaultPersonalSource, vaultGeneratedStore, personalKey } from '../lib/sources/file-sources.js'
export { leased } from '../lib/sources/lease.js'
export type { ScopedSource } from '../lib/sources/cascade.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BuilderSession } from '@pikkustudio/builder'
import { StudioAi, type AiChoiceStore, type AiSecretStore } from './ai.js'
import { StudioHooks } from './hooks.js'
import { LogCollector, forwardFromEnv } from './log-collector.js'
import { memoryLogStore, type LogStore } from './log-store.js'
import { STUDIO_KEY, StudioProjectsService, studioHome, type AccountProvider, type ProjectStore } from './projects.js'
import { StudioPublisher, type PublishTarget } from './publish.js'
import { StudioSettingsStore } from './settings.js'
import type { SettingStore } from './setting-store.js'

export interface StudioServices {
  home: string
  studioAi: StudioAi
  studioProjects: StudioProjectsService
  studioPublisher: StudioPublisher
  studioBuilder: BuilderSession
  studioSettings: StudioSettingsStore
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
  /** The contributed project sources, by namespace (`projectSources.<namespace>`). */
  sources?: Record<string, AccountProvider>
  builder?: BuilderSession
  projectEnv?: (key: string, generated: Record<string, string>) => Promise<Record<string, string>>
  devContributors?: string[]
  /** Where a person's own AI key is kept (the host's secret store). Without one, key choices are refused. */
  aiSecrets?: AiSecretStore
  /** Where the AI choice is kept (Studio's database). Without one it is held in memory only. */
  aiChoice?: AiChoiceStore
  /** Where the name, about and sign-in choice are kept (Studio's database). Without one they are held in memory only. */
  settingsStore?: SettingStore<Partial<import('./settings.js').StudioSettings>>
  personalSource?: (projectId: string) => ScopedSource | undefined
  generatedStore?: (projectId: string) => GeneratedStore
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
  const studioAi = new StudioAi(options.aiSecrets, options.aiChoice)
  await studioAi.load()
  const studioSettings = new StudioSettingsStore(options.settingsStore)
  const studioProjects =
    options.projects ??
    new StudioProjectsService({
      home,
      sources: options.sources,
      currentRoot: process.env.PIKKU_STUDIO_PROJECT || null,
      pinned: Boolean(process.env.PIKKU_STUDIO_PROJECT),
      appsManifest: process.env.FRONTENDS_MANIFEST_FILE,
      designEntry: options.designEntry ?? resolveDesignEntry(),
      store: options.projectStore,
      personalSource: options.personalSource,
      generatedStore: options.generatedStore,
      teamSource: options.teamSource,
      owner: async () => (await studioSettings.read()).name ?? '',
      devContributors: options.devContributors,
      env: async (key, generated) => ({ ...(await studioAi.env()), ...((await options.projectEnv?.(key, generated)) ?? {}) }),
    })
  const studioModels = new Map<string, string>()
  const studioBuilder =
    options.builder ??
    new BuilderSession(async (key, mode, locale) => {
      const env = await studioAi.env()
      const proxyUrl = process.env.PIKKU_BUILDER_PROXY_URL
      const proxyKey = process.env.PIKKU_BUILDER_PROXY_KEY
      const account =
        proxyUrl && proxyKey
          ? { proxyUrl, apiKey: proxyKey }
          : env.PIKKU_STUDIO_AI === 'source'
            ? await studioProjects.modelAccess(locale, env.PIKKU_STUDIO_AI_SOURCE)
            : null
      const litellm =
        env.PIKKU_STUDIO_AI_PROVIDER === 'litellm' && env.PIKKU_STUDIO_AI_BASE_URL
          ? { proxyUrl: `${env.PIKKU_STUDIO_AI_BASE_URL.replace(/\/+$/, '')}/v1`, apiKey: env.PIKKU_STUDIO_AI_KEY ?? 'none' }
          : null
      if (!account && !env.PIKKU_STUDIO_AI) throw new Error('Choose your AI before building')
      const launch = await studioProjects.builderLaunch(key, mode)
      return {
        ...launch,
        ai: litellm
          ? {
              model: studioModels.get(key) ?? env.PIKKU_STUDIO_MODEL,
              proxy: { url: litellm.proxyUrl, key: litellm.apiKey },
            }
          : account
          ? {
              model: studioModels.get(key) ?? process.env.PIKKU_STUDIO_MODEL ?? env.PIKKU_STUDIO_MODEL ?? 'deepseek-v4.1-flash',
              proxy: { url: account.proxyUrl, key: account.apiKey },
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
    studioSettings,
    studioHooks: new StudioHooks(),
    studioModels,
    studioLogs,
  }
  instances.set(home, services)
  return services
}

export { LOCAL_TEAM, studioHome } from './projects.js'
export { StudioSettingsStore } from './settings.js'
export { kyselySetting, memorySetting, type SettingStore } from './setting-store.js'
export { StudioAi, kyselyAiChoiceStore } from './ai.js'
export { StudioProjectsService, fileProjectStore } from './projects.js'
export { kyselyProjectStore } from './project-store.js'
export { kyselyLogStore } from './log-store.js'
export type { ProjectStore, RegistryEntry, StudioProject } from './projects.js'
export { StudioPublisher } from './publish.js'
export type { PublishTarget, Runner } from './publish.js'
export { sourceKey, sourceOf } from './projects.js'
export type { AccountLink, AccountProvider, SourceProject, StudioAccount, WorkspacePhase, WorkspaceProgress } from './projects.js'
export type { PresenceHost, ProjectDecorator, ProjectDecoratorFactory, StudioPresence } from './extensions.js'
export { StudioHooks } from './hooks.js'
export type { SignInChoice, StudioSettings } from './settings.js'
export type { BuilderSession }
