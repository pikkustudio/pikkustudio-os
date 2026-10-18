import type {
  CoreConfig,
  CoreServices,
  CoreSingletonServices,
  CoreUserSession,
} from '@pikku/core/types'
import type { InboxAccess, InboxStore } from '../src/lib/types.js'

export interface Config extends CoreConfig {}

export interface UserSession extends CoreUserSession {
  userId: string
}

export interface SingletonServices extends CoreSingletonServices<Config> {
  inboxStore: InboxStore
  inboxAccess?: InboxAccess
  inboxSecret?: string
}

export interface Services extends CoreServices<SingletonServices> {}
