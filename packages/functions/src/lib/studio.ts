import { join } from 'node:path'
import { devContributors } from './dev-contributors.js'
import {
  createStudioServices,
  fileProjectStore,
  kyselyLogStore,
  kyselyProjectStore,
  studioHome,
  type AccountProvider,
  type BuilderSession,
  type ProjectDecorator,
  type ProjectDecoratorFactory,
  type PublishTarget,
  type ScopedSource,
  type SignInChoice,
  type StudioAi,
  type StudioProjectsService,
  type StudioPublisher,
  type StudioSettingsFile,
  vaultPersonalSource,
} from '@pikkustudio/addon-studio/services'
import type { Kysely } from 'kysely'
import { connectVault, projectVaultEnv } from '@pikkustudio/vault/connect'
import { mintInboxToken } from '@pikkustudio/addon-inbox/token'
import { frameSecret } from './addon-frame-token.js'
import { installEmbeddedRuntime } from './runtime.js'
import { holdWhileStreaming } from './sleep.js'
import { StudioAudit, instrumentStudio } from './studio-audit.js'

export interface Studio {
  home: string
  ai: StudioAi
  projects: StudioProjectsService
  publisher: StudioPublisher
  builder: BuilderSession
  settings: StudioSettingsFile
  audit: StudioAudit
  models: Map<string, string>
  /** Background work the addons' project decorators run; reconciled on wake and stopped on sleep. */
  decorators: ProjectDecorator[]
}

/** What the wired addons add to Studio, read from the services their contributors provide. */
export interface StudioExtensions {
  /** Contributed project sources by namespace (`projectSources.<namespace>`). */
  sources?: Record<string, AccountProvider>
  publishTargets?: PublishTarget[]
  teamSource?: (projectId: string, projectPath: string) => ScopedSource | undefined
  projectDecorators?: ProjectDecoratorFactory[]
}

export type { SignInChoice }

const inboxEnv = (home: string, key: string): Record<string, string> => {
  const dot = key.indexOf('.')
  const projectKey = dot < 0 ? key : key.slice(0, dot)
  const { token } = mintInboxToken({ secret: frameSecret(home), projectKey, stage: null })
  return {
    STUDIO_INBOX_URL: `http://127.0.0.1:${process.env.API_PORT || '4003'}/rpc/inbox:recordMessage`,
    STUDIO_INBOX_TOKEN: token,
  }
}

export async function createStudio(home = studioHome(), db?: Kysely<any>, extensions: StudioExtensions = {}): Promise<Studio> {
  const runtime = await installEmbeddedRuntime(home)
  if (runtime) process.env.PIKKU_STUDIO_CORE_BIN = join(runtime, 'bin')
  const core = await createStudioServices({
    home,
    sources: extensions.sources,
    publishTargets: extensions.publishTargets,
    teamSource: extensions.teamSource,
    projectStore: db ? kyselyProjectStore(db, fileProjectStore(home)) : undefined,
    logStore: db ? kyselyLogStore(db) : undefined,
    personalSource: (projectId) =>
      vaultPersonalSource(
        {
          keys: async () => (await connectVault(home)).admin.keys(),
          get: async (key) => {
            const secrets = (await connectVault(home)).secrets
            return (await secrets.hasSecret(key)) ? (await secrets.getSecret(key)).reveal() : undefined
          },
        },
        projectId
      ),
    aiSecrets: {
      has: async (name) => (await connectVault(home)).secrets.hasSecret(name),
      get: async (name) => (await (await connectVault(home)).secrets.getSecret(name)).reveal(),
      set: async (name, value) => (await connectVault(home)).secrets.setSecret(name, value),
    },
    devContributors: devContributors(),
    projectEnv: async (key, generated) => ({
      ...(await projectVaultEnv(home, key, generated)),
      ...inboxEnv(home, key),
    }),
  })
  const audit = new StudioAudit(home)
  instrumentStudio(audit, core)
  const decorators = (extensions.projectDecorators ?? []).map((factory) => factory(core.studioProjects))
  for (const decorator of decorators) {
    core.studioHooks.onChange(() => decorator.reconcile())
    core.studioHooks.decorateProjects((project) => decorator.decorate(project))
  }
  core.studioHooks.wrapProxied(holdWhileStreaming)
  return {
    home,
    ai: core.studioAi,
    projects: core.studioProjects,
    publisher: core.studioPublisher,
    builder: core.studioBuilder,
    settings: core.studioSettings,
    audit,
    models: core.studioModels,
    decorators,
  }
}
