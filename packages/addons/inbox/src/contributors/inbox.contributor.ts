import type { PlatformServiceContributor } from '@pikku/deploy'

export const INBOX_URL_ENV = 'STUDIO_INBOX_URL'
export const INBOX_TOKEN_ENV = 'STUDIO_INBOX_TOKEN'
export const INBOX_DEPLOY_REF_ENV = 'STUDIO_INBOX_DEPLOY_REF'

const captureSource = `
interface StudioInboxCaptureOptions {
  url: string
  token: string
  deployRef: () => string | null
}

const studioInboxList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

class StudioInboxEmailCapture {
  constructor(private readonly options: StudioInboxCaptureOptions) {}

  async send(input: {
    to: string | string[]
    from?: string
    cc?: string | string[]
    bcc?: string | string[]
    subject?: string
    html?: string
    text?: string
    template?: { name: string; locale?: string; data?: Record<string, unknown> }
  }): Promise<{ messageId?: string }> {
    const template = input.template ?? null
    const message = {
      channel: 'email',
      from: input.from ?? null,
      to: studioInboxList(input.to),
      cc: studioInboxList(input.cc),
      bcc: studioInboxList(input.bcc),
      subject: input.subject ?? template?.name ?? null,
      html: input.html ?? null,
      body: input.text ?? (template ? JSON.stringify(template.data ?? {}, null, 2) : ''),
      templateName: template?.name ?? null,
      templateLocale: template ? (template.locale ?? null) : null,
      deployRef: this.options.deployRef(),
      meta: null,
    }
    try {
      const response = await fetch(this.options.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: { token: this.options.token, message } }),
      })
      if (!response.ok) throw new Error('Studio answered ' + response.status + ' when handed an email')
      const body = (await response.json().catch(() => ({}))) as { id?: string }
      return { messageId: body.id }
    } catch (error: unknown) {
      console.warn('Could not hand a message to the inbox:', error instanceof Error ? error.message : String(error))
      return {}
    }
  }
}
`.trim()

export const createInboxContributor = (): PlatformServiceContributor => ({
  name: 'inbox',
  imports: [captureSource],
  emit: () => [
    `  const studioInboxUrl = env.${INBOX_URL_ENV}`,
    `  const studioInboxToken = env.${INBOX_TOKEN_ENV}`,
    `  if (studioInboxUrl && studioInboxToken) {`,
    `    services.emailService = new StudioInboxEmailCapture({`,
    `      url: studioInboxUrl,`,
    `      token: studioInboxToken,`,
    `      deployRef: () => env.${INBOX_DEPLOY_REF_ENV} ?? null,`,
    `    })`,
    `  }`,
  ],
})

export default createInboxContributor()
