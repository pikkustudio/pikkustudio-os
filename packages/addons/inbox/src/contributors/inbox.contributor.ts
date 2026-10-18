import type { PlatformServiceContributor } from '@pikku/deploy'

export const INBOX_URL_ENV = 'STUDIO_INBOX_URL'
export const INBOX_TOKEN_ENV = 'STUDIO_INBOX_TOKEN'
export const INBOX_DEPLOY_REF_ENV = 'STUDIO_INBOX_DEPLOY_REF'

export interface InboxContributorOptions {
  serviceModule?: string
  templateRendererModule?: string | null
}

const DEFAULT_SERVICE_MODULE = new URL('../services/studio-inbox-email.service.ts', import.meta.url).href
const DEFAULT_RENDERER_MODULE = './email/pikku-emails.gen.js'

export const createInboxContributor = (options: InboxContributorOptions = {}): PlatformServiceContributor => {
  const serviceModule = options.serviceModule ?? DEFAULT_SERVICE_MODULE
  const rendererModule = options.templateRendererModule === undefined ? DEFAULT_RENDERER_MODULE : options.templateRendererModule
  return {
    name: 'inbox',
    imports: [`import { StudioInboxEmailService } from ${JSON.stringify(serviceModule)}`],
    emit: () => [
      `  if (env.${INBOX_URL_ENV} && env.${INBOX_TOKEN_ENV}) {`,
      ...(rendererModule
        ? [
            `    const rendered = await import(${JSON.stringify(rendererModule)}).catch(() => null)`,
            `    const renderEmailTemplate = rendered?.renderEmailTemplate`,
            `    const render = renderEmailTemplate ? (template: { name: string; locale?: string; data?: Record<string, unknown> }) => (renderEmailTemplate as (input: { name: string; locale: string; data: Record<string, unknown> }) => Promise<{ subject: string; html: string; text?: string }>)({ name: template.name, locale: template.locale ?? 'en', data: template.data ?? {} }) : undefined`,
          ]
        : [`    const render = undefined`]),
      `    services.emailService = new StudioInboxEmailService({`,
      `      url: env.${INBOX_URL_ENV},`,
      `      token: env.${INBOX_TOKEN_ENV},`,
      `      render,`,
      `      deployRef: () => env.${INBOX_DEPLOY_REF_ENV} ?? null,`,
      `      onError: (error) => console.warn('Could not hand a message to the inbox:', error instanceof Error ? error.message : String(error)),`,
      `    })`,
      `  }`,
    ],
  }
}

export default createInboxContributor()
