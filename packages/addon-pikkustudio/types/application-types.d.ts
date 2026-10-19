import type {
  CoreConfig,
  CoreServices,
  CoreSingletonServices,
  CoreUserSession,
} from '@pikku/core/types'
import type { StudioAi } from '../src/services/ai.js'
import type { StudioHooks } from '../src/services/hooks.js'
import type { StudioProjectsService } from '../src/services/projects.js'
import type { LogStore } from '../src/services/log-store.js'
import type { LogSources, MetricSources, StageAudit, StageDirectory } from '../src/services/log-source.js'
import type { StageAnalytics, StageReleases, StageSettingsStore } from '../src/services/stage-source.js'
import type { StudioPublisher } from '../src/services/publish.js'
import type { StudioSettingsFile } from '../src/services/settings.js'
import type { ToolResolver } from '../src/lib/tools/resolver.js'
import type { BuilderSession } from '@pikkustudio/builder'
import type { BetterAuthInstance } from '@pikku/better-auth'
import type { Kysely } from 'kysely'

export interface Config extends CoreConfig {}

export interface UserSession extends CoreUserSession {}

export interface SingletonServices extends CoreSingletonServices<Config> {
  studioAi: StudioAi
  studioProjects: StudioProjectsService
  studioPublisher: StudioPublisher
  studioBuilder: BuilderSession
  studioSettings: StudioSettingsFile
  studioHooks: StudioHooks
  studioLogs: LogStore
  studioModels: Map<string, string>
  studioTools: ToolResolver
  auth?: () => Promise<BetterAuthInstance>
  kysely?: Kysely<any>
  logSources?: LogSources
  metricSources?: MetricSources
  stageDirectory?: StageDirectory
  stageAudit?: StageAudit
  stageReleases?: StageReleases
  stageSettings?: StageSettingsStore
  stageAnalytics?: StageAnalytics
}

export interface Services extends CoreServices<SingletonServices> {}
