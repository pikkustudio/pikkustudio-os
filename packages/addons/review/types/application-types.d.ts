import type {
  CoreConfig,
  CoreServices,
  CoreSingletonServices,
  CoreUserSession,
} from '@pikku/core/types'
import type { MetaSource } from '../src/services/meta-source.interface.js'
import type { UiSource } from '../src/services/ui-source.interface.js'
import type { RuntimeSignals } from '../src/services/runtime-signals.interface.js'
import type { CommentStore, VerdictStore } from '../src/lib/types.js'

export interface Config extends CoreConfig {}

export interface UserSession extends CoreUserSession {
  userId: string
  orgId: string
}

export interface SingletonServices extends CoreSingletonServices<Config> {
  verdictStore: VerdictStore
  commentStore: CommentStore
  metaSource: MetaSource
  uiSource: UiSource
  runtimeSignals: RuntimeSignals
}

export interface Services extends CoreServices<SingletonServices> {}
