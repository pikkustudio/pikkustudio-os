import type { CoreConfig, CoreServices, CoreSingletonServices, CoreUserSession } from '@pikku/core/types'
import type { ContentService } from '@pikku/core/services'
import type { Kysely } from 'kysely'

export interface Config extends CoreConfig {
  port: number
  hostname: string
}

export interface UserSession extends CoreUserSession {
  userId: string
}

export interface SingletonServices extends CoreSingletonServices<Config> {
  kysely: Kysely<any>
  content: ContentService
  auth: () => Promise<any>
}

export interface Services extends CoreServices<SingletonServices> {}
