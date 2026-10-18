import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { StudioInboxEmailService, type TemplateRenderer } from './studio-inbox-email.service.js'

export const INBOX_URL_ENV = 'STUDIO_INBOX_URL'
export const INBOX_TOKEN_ENV = 'STUDIO_INBOX_TOKEN'

const loadRenderer = async (rootDir: string): Promise<TemplateRenderer | undefined> => {
  const file = ['pikku-emails.gen.ts', 'pikku-emails.gen.js']
    .map((name) => join(rootDir, '.pikku', 'email', name))
    .find((candidate) => existsSync(candidate))
  if (!file) return undefined
  const mod = (await import(pathToFileURL(file).href)) as {
    renderEmailTemplate?: (input: { name: string; locale: string; data: Record<string, unknown> }) => {
      subject: string
      html: string
      text?: string
    }
  }
  const render = mod.renderEmailTemplate
  if (!render) return undefined
  return (template) => render({ name: template.name, locale: template.locale ?? 'en', data: template.data ?? {} })
}

const deployRefOf = (rootDir: string) => {
  let cached: { at: number; value: Promise<string | null> } | undefined
  return () => {
    if (!cached || Date.now() - cached.at > 30_000) {
      cached = {
        at: Date.now(),
        value: new Promise((resolve) =>
          execFile('git', ['rev-parse', '--short', 'HEAD'], { cwd: rootDir }, (error, out) =>
            resolve(error ? null : out.trim() || null)
          )
        ),
      }
    }
    return cached.value
  }
}

export default async function studioDevServices(
  _local: Record<string, unknown>,
  context: { rootDir: string; env?: NodeJS.ProcessEnv; logger?: { warn: (message: string) => void } }
): Promise<Record<string, unknown>> {
  const env = context.env ?? process.env
  const url = env[INBOX_URL_ENV]
  const token = env[INBOX_TOKEN_ENV]
  if (!url || !token) return {}
  return {
    emailService: new StudioInboxEmailService({
      url,
      token,
      render: await loadRenderer(context.rootDir),
      deployRef: deployRefOf(context.rootDir),
      onError: (error) =>
        context.logger?.warn(`Could not hand an email to Studio: ${error instanceof Error ? error.message : String(error)}`),
    }),
  }
}
