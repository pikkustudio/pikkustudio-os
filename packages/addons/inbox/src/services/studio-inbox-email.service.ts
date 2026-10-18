import type { EmailService, SendEmailInput, SendEmailResult } from '@pikku/core/services'

export interface RenderedEmail {
  subject: string
  html: string
  text?: string
}

export type TemplateRenderer = (template: {
  name: string
  locale?: string
  data?: Record<string, unknown>
}) => RenderedEmail | Promise<RenderedEmail>

export interface StudioInboxEmailOptions {
  url: string
  token: string
  render?: TemplateRenderer
  deployRef?: () => Promise<string | null> | string | null
  fetch?: typeof fetch
  onError?: (error: unknown) => void
}

const list = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value])

export class StudioInboxEmailService implements EmailService {
  constructor(private readonly options: StudioInboxEmailOptions) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const template = 'template' in input && input.template ? input.template : null
    const rendered = template && this.options.render ? await this.options.render(template) : null
    const subject = rendered?.subject ?? input.subject ?? template?.name ?? ''
    const html = rendered?.html ?? ('html' in input && typeof input.html === 'string' ? input.html : '')
    const text =
      rendered?.text ??
      ('text' in input && typeof input.text === 'string'
        ? input.text
        : template && !rendered
          ? JSON.stringify(template.data ?? {}, null, 2)
          : '')

    const message = {
      channel: 'email' as const,
      from: input.from ?? null,
      to: list(input.to),
      cc: list(input.cc),
      bcc: list(input.bcc),
      subject: subject || null,
      html: html || null,
      body: text,
      templateName: template?.name ?? null,
      templateLocale: template ? (template.locale ?? null) : null,
      deployRef: (await this.options.deployRef?.()) ?? null,
      meta: null,
    }

    try {
      const response = await (this.options.fetch ?? fetch)(this.options.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: { token: this.options.token, message } }),
      })
      if (!response.ok) {
        throw new Error(`Studio answered ${response.status} when handed an email`)
      }
      const body = (await response.json().catch(() => ({}))) as { id?: string }
      return { messageId: body.id }
    } catch (error) {
      this.options.onError?.(error)
      return {}
    }
  }
}
