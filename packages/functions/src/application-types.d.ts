import type {
  CoreServices,
  CoreSingletonServices,
  CoreConfig,
  CoreUserSession,
} from '@pikku/core/types'
import type { AuditLog, EmailService } from '@pikku/core/services'
import type { Kysely } from 'kysely'
import type { DB } from '#pikku/db/schema.gen.js'
import type { TypedSecretService } from '../.pikku/secrets/pikku-secrets.gen.js'
import type { TypedVariablesService } from '../.pikku/variables/pikku-variables.gen.js'
import type { auth } from './auth.js'
import type { Studio } from './lib/studio.js'
import type { VaultAdmin } from '@pikkustudio/vault/admin'
import type { InboxStore } from '@pikkustudio/addon-inbox/types'
import type { CommentStore, VerdictStore } from '@pikkustudio/addon-review/types'
import type { worktreeMetaSource } from './lib/worktree-meta-source.js'
import type { LogSources, MetricSources, StageAudit, StageDirectory } from '@pikkustudio/addon-studio/sources'

export interface UserSession extends CoreUserSession {
  userId: string
}

export interface Config extends CoreConfig {
  port: number
  hostname: string
}

export interface SingletonServices extends CoreSingletonServices<Config> {
  variables: TypedVariablesService
  secrets: TypedSecretService
  vaultAdmin: VaultAdmin
  verdictStore: VerdictStore
  inboxStore: InboxStore
  inboxSecret?: string
  commentStore: CommentStore
  metaSource: ReturnType<typeof worktreeMetaSource>
  kysely: Kysely<DB>
  // Lazy Better Auth factory, injected by the generated pikkuServices wrapper.
  // MUST be the factory shape `() => Promise<AuthInstance>` to satisfy
  // CoreSingletonServices['auth'] — call it (`await services.auth()`) to get
  // better-auth's full server `api`/`handler` surface; it memoises on first call.
  auth: () => Promise<Awaited<ReturnType<typeof auth>>>
  // Always constructed in services.ts, so declare it REQUIRED here — it is
  // optional in CoreSingletonServices, which otherwise makes every emailService
  // use read as possibly-undefined and forces needless `!`/guards in functions.
  emailService: EmailService
  // Per-invocation audit log, ALWAYS returned from createWireServices (see
  // services.ts) so general activity logging is available in every function —
  // `await auditLog.write({ type, source: 'explicit', metadata })`. Declared
  // REQUIRED (like emailService above) so a plain `auditLog.write(...)` doesn't
  // read as possibly-undefined and force needless `?.`/guards. A function with
  // `audit: true` ADDITIONALLY gets a kysely wrapped to capture every table write.
  auditLog: AuditLog
  studio: Studio
  // Contributed at build time: addon-studio's studioSources gives the workspace kind,
  // hosts that see the cloud add stage and sandbox. Absent under plain `pikku serve`.
  logSources?: LogSources
  metricSources?: MetricSources
  stageDirectory?: StageDirectory
  stageAudit?: StageAudit
}

export interface Services extends CoreServices<SingletonServices> {}
