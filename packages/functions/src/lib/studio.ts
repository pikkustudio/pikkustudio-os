import { join } from 'node:path'
import {
  createStudioServices,
  fileProjectStore,
  kyselyLogStore,
  kyselyProjectStore,
  studioHome,
  type BuilderSession,
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
import { ToolResolver } from './tools/resolver.js'
import { StudioAudit, instrumentStudio } from './studio-audit.js'

export interface Studio {
  home: string
  ai: StudioAi
  projects: StudioProjectsService
  publisher: StudioPublisher
  builder: BuilderSession
  settings: StudioSettingsFile
  tools: ToolResolver
  audit: StudioAudit
  models: Map<string, string>
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

export async function createStudio(home = studioHome(), db?: Kysely<any>): Promise<Studio> {
  const runtime = await installEmbeddedRuntime(home)
  const tools = new ToolResolver({
    home,
    coreBin: runtime ? [join(runtime, 'bin')] : [],
    autoInstall: (process.env.PIKKU_STUDIO_TOOLS_AUTO_INSTALL ?? '').split(',').map((id) => id.trim()).filter(Boolean),
  })
  const core = await createStudioServices({
    home,
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
    projectEnv: async (key, generated) => ({
      ...(await projectVaultEnv(home, key, generated)),
      ...inboxEnv(home, key),
    }),
  })
  const audit = new StudioAudit(home)
  instrumentStudio(audit, core)
  core.studioHooks.wrapProxied(holdWhileStreaming)
  return {
    home,
    ai: core.studioAi,
    projects: core.studioProjects,
    publisher: core.studioPublisher,
    builder: core.studioBuilder,
    settings: core.studioSettings,
    tools,
    audit,
    models: core.studioModels,
  }
}
