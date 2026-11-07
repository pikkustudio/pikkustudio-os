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
import { memoryProfile, type ProfileStore } from './profile.js'
import type { SettingStore } from './setting-store.js'

export interface StudioServices {
  home: string
  studioAi: StudioAi
  studioProjects: StudioProjectsService
  studioPublisher: StudioPublisher
  studioBuilder: BuilderSession
  studioSettings: StudioSettingsStore
  studioProfile: ProfileStore
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
  /** Where a person's own AI key is kept (the host's secret store). Without one, key choices are refused. */
  aiSecrets?: AiSecretStore
  /** Where the AI choice is kept (Studio's database). Without one it is held in memory only. */
  aiChoice?: AiChoiceStore
  /** Where the name, about and sign-in choice are kept (Studio's database). Without one they are held in memory only. */
  profileStore?: ProfileStore
  settingsStore?: SettingStore<Partial<import('./settings.js').StudioSettings>>
  inboxCapture?: string
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

/** Clearing away finished session worktrees is report-only until PIKKU_STUDIO_SWEEP_REMOVE=1. */
const sweepFromEnv = () => {
  const days = Number(process.env.PIKKU_STUDIO_SWEEP_IDLE_DAYS)
  return {
    remove: process.env.PIKKU_STUDIO_SWEEP_REMOVE === '1',
    idleMs: Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 * 1000 : undefined,
    wt: process.env.PIKKU_STUDIO_WT || undefined,
  }
}

const SWEEP_EVERY_MS = 60 * 60 * 1000

/** Look over the session worktrees at startup and then every hour. A failed look is logged and tried again next time. */
function startSessionReaper(projects: StudioProjectsService) {
  const look = async () => {
    try {
      for (const report of await projects.sweepSessions()) {
        if (report.error && report.error !== 'no layout here') console.warn(`[studio] session sweep: ${report.error}`)
        for (const e of report.entries.filter((x) => x.action !== 'kept')) console.log(`[studio] session ${e.key}: ${e.action}`)
      }
    } catch (error) {
      console.warn(`[studio] session sweep failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  void look()
  setInterval(() => void look(), SWEEP_EVERY_MS).unref()
}

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
  const studioProfile = options.profileStore ?? memoryProfile()
  const studioProjects =
    options.projects ??
    new StudioProjectsService({
      home,
      sources: options.sources,
      currentRoot: process.env.PIKKU_STUDIO_PROJECT || null,
      pinned: Boolean(process.env.PIKKU_STUDIO_PROJECT),
      appsManifest: process.env.FRONTENDS_MANIFEST_FILE,
      designEntry: options.designEntry ?? resolveDesignEntry(),
      sweep: sweepFromEnv(),
      store: options.projectStore,
      personalSource: options.personalSource,
      generatedStore: options.generatedStore,
      teamSource: options.teamSource,
      inboxCapture: options.inboxCapture,
      owner: async () => (await studioProfile.owner()).name ?? '',
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
  if (!options.projects) startSessionReaper(studioProjects)
  const services: StudioServices = {
    home,
    studioAi,
    studioProjects,
    studioPublisher: options.publisher ?? new StudioPublisher(studioProjects, options.publishTargets),
    studioBuilder,
    studioSettings,
    studioProfile,
    studioHooks: new StudioHooks(),
    studioModels,
    studioLogs,
  }
  instances.set(home, services)
  return services
}

export { LOCAL_TEAM, studioHome } from './projects.js'
export { StudioSettingsStore } from './settings.js'
export { asUser, currentUserId, ownerUserId, requestUserId } from './current-user.js'
export { kyselyProfile, memoryProfile, UNNAMED_OWNER, type Profile, type ProfileStore } from './profile.js'
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
