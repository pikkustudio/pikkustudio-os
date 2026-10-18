import {
  JsonConsoleLogger,
  LocalEmailService,
  LocalSecretService,
  LocalVariablesService,
  NoopAuditService,
  createInvocationAudit,
} from '@pikku/core/services'
import {
  createAuditedKysely,
  KyselyFeatureFlagStore,
  KyselyVirtualUserRunStore,
  KyselyVirtualUserScheduleStore,
} from '@pikku/kysely'
import { pikkuServices, pikkuWireServices } from '#pikku/setup'
import { TypedSecretService } from '../.pikku/secrets/pikku-secrets.gen.js'
import { TypedVariablesService } from '../.pikku/variables/pikku-variables.gen.js'
import { CFWorkerSchemaService } from '@pikku/schema-cfworker'
import type { Kysely } from 'kysely'
import { GeneratedTemplateEmailService } from './lib/email-service.js'
import { declareFlagsTo } from './lib/declared-flag-source.js'
import type { DB } from '#pikku/db/schema.gen.js'
import { join } from 'node:path'
import { studioHome } from '@pikkustudio/addon-studio/services'
import { KyselyAgentRunService, KyselyAgentRunStateService, KyselyAgentStorageService } from '@pikku/kysely'
import { studioAgentRunner } from './lib/chat-runner.js'
import { createStudio } from './lib/studio.js'
import { studioInboxAccess } from './lib/studio-inbox-access.js'
import { studioAuthSecret } from './lib/auth-secret.js'
import { connectVault } from '@pikkustudio/vault/connect'
import { KyselyCommentStore } from '@pikkustudio/addon-review/comment-store'
import { frameSecret } from './lib/addon-frame-token.js'
import { KyselyInboxStore } from '@pikkustudio/addon-inbox/store'
import { KyselyVerdictStore } from '@pikkustudio/addon-review/store'
import { worktreeMetaSource } from './lib/worktree-meta-source.js'

process.env.PIKKU_DATA_DIR ??= join(studioHome(), 'data')
process.env.BETTER_AUTH_SECRET ??= studioAuthSecret(studioHome())

export const createSingletonServices = pikkuServices(async (config, existingServices) => {
  const variables =
    existingServices?.variables ?? new TypedVariablesService(new LocalVariablesService())
  const logger = existingServices?.logger ?? new JsonConsoleLogger()
  // The durable audit sink. In a deployed stage the cloud injects the platform's
  // audit service; locally it falls back to a no-op so nothing is persisted.
  const audit = existingServices?.audit ?? new NoopAuditService()
  // kysely is injected by pikku dev (node:sqlite) or the CF Worker workflow (libsql).
  // The template never constructs its own dialect — dialects are cloud runtime
  // concerns — so it must always be provided by the runtime.
  if (!existingServices?.kysely) {
    throw new Error('kysely service was not injected by the runtime (pikku dev / cloud)')
  }
  const kysely: Kysely<DB> = existingServices.kysely
  const vault = await connectVault(studioHome(), new LocalSecretService(variables))
  const secrets = existingServices?.secrets ?? new TypedSecretService(vault.secrets)
  const schema = existingServices?.schema ?? new CFWorkerSchemaService(logger)
  const emailService =
    existingServices?.emailService ??
    new GeneratedTemplateEmailService({
      delegate: new LocalEmailService(),
    })

  // Per-user credential store (wire.getCredential) — needed by addons imported
  // with --auth per-user/delegated. A deployed stage injects it: credentials are
  // sealed to the stage, and only its secrets Worker holds the key. There is no
  // fallback because there is no key to fall back to — the template used to
  // build a `KyselyCredentialService` from a `CREDENTIALS_KEY` secret, which was
  // the stage's own KEK handed to every unit. Outside a stage the app runs fine
  // and credential-using addon calls fail with a clear error from the addon's
  // wire services; wire your own `credentialService` here if you need one.
  const credentialService = existingServices?.credentialService

  const featureFlags = existingServices?.featureFlags ?? new KyselyFeatureFlagStore(kysely as any)
  declareFlagsTo(featureFlags)

  const virtualUserRunStore =
    existingServices?.virtualUserRunStore ?? new KyselyVirtualUserRunStore(kysely as any)
  const virtualUserScheduleStore =
    existingServices?.virtualUserScheduleStore ?? new KyselyVirtualUserScheduleStore(kysely as any)

  const studio = existingServices?.studio ?? (await createStudio(undefined, kysely))

  return {
    ...(existingServices ?? {}),
    config,
    agentRunner: existingServices?.agentRunner ?? studioAgentRunner(studio.ai),
    agentStorage: existingServices?.agentStorage ?? new KyselyAgentStorageService(kysely as any),
    agentRunState: existingServices?.agentRunState ?? new KyselyAgentRunStateService(kysely as any),
    agentRunService: existingServices?.agentRunService ?? new KyselyAgentRunService(kysely as any),
    variables,
    secrets,
    vaultAdmin: vault.admin,
    schema,
    logger,
    emailService,
    audit,
    featureFlags,
    kysely,
    virtualUserRunStore,
    virtualUserScheduleStore,
    studio,
    verdictStore: existingServices?.verdictStore ?? new KyselyVerdictStore(kysely as any),
    inboxStore: existingServices?.inboxStore ?? new KyselyInboxStore(kysely as any),
    inboxSecret: existingServices?.inboxSecret ?? frameSecret(studio.home),
    inboxAccess: existingServices?.inboxAccess ?? studioInboxAccess(studio.projects),
    commentStore: existingServices?.commentStore ?? new KyselyCommentStore(kysely as any),
    metaSource: existingServices?.metaSource ?? worktreeMetaSource((id) => studio.projects.projectDir(id)),
    ...(credentialService ? { credentialService } : {}),
  }
})

export const createWireServices = pikkuWireServices(async (singletonServices, wire) => {
  if (!singletonServices.audit) {
    return {}
  }
  const auditLog = createInvocationAudit(singletonServices.audit, wire)
  // auditLog is ALWAYS injected, but `auditLog.write(...)` only PERSISTS when this
  // function set `audit: true` — createInvocationAudit gates on wire.audit, so
  // without it write() is a warn-only no-op (see @pikku/core audit-service.ts).
  // `auditLog.config` is set ONLY when audit: true is on, and when it is, ALSO wrap
  // kysely so every query is captured and the runner flushes the buffer on close.
  // Without audit: true, leave the plain kysely untouched — no per-query overhead.
  if (!auditLog.config) {
    return { auditLog }
  }
  return {
    auditLog,
    kysely: createAuditedKysely(singletonServices.kysely, { audit: auditLog }),
  }
})
