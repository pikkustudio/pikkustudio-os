import type { Contributor } from '@pikku/core/contributors'
import { StudioInboxEmailService } from '../services/studio-inbox-email.service.js'

export const INBOX_URL_ENV = 'STUDIO_INBOX_URL'
export const INBOX_TOKEN_ENV = 'STUDIO_INBOX_TOKEN'
export const INBOX_DEPLOY_REF_ENV = 'STUDIO_INBOX_DEPLOY_REF'

/**
 * Hands every email the app sends to the Studio inbox instead of delivering it.
 * Studio sets the url and token in the project's env; with either missing the
 * app's own `emailService` is left alone.
 */
export const inboxContributor: Contributor = {
  provides: ['emailService'],
  run(services, env) {
    const url = env[INBOX_URL_ENV]
    const token = env[INBOX_TOKEN_ENV]
    if (!url || !token) return
    services.emailService = new StudioInboxEmailService({
      url,
      token,
      deployRef: () => env[INBOX_DEPLOY_REF_ENV] ?? null,
      onError: (error) =>
        console.warn('Could not hand a message to the inbox:', error instanceof Error ? error.message : String(error)),
    })
  },
}
