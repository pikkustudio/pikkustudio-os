import { test, expect } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import contributor, { createInboxContributor } from './inbox.contributor.js'

const generate = (c: typeof contributor) => {
  const dir = mkdtempSync(join(tmpdir(), 'inbox-contributor-'))
  const file = join(dir, 'pikku-dev-platform-services.gen.ts')
  const imports = typeof c.imports === 'function' ? c.imports({} as never) : (c.imports ?? [])
  const lines = c.emit({ ctx: {} as never, platform: {} as never, isGateway: false })
  writeFileSync(
    file,
    [
      ...imports,
      '',
      'export const createPlatformServices = async (env: Record<string, string | undefined>): Promise<Record<string, any>> => {',
      '  const services: Record<string, any> = {}',
      ...lines,
      '  return services',
      '}',
      '',
    ].join('\n')
  )
  return file
}

test('the contributor is named inbox', () => {
  expect(contributor.name).toBe('inbox')
})

test('both env vars set: the generated file installs the capturing email service', async () => {
  const sent: { url: string; body: any }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    sent.push({ url, body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ id: 'x' }), { status: 200 })
  }) as never
  try {
    const { createPlatformServices } = await import(generate(contributor))
    const services = await createPlatformServices({ STUDIO_INBOX_URL: 'http://studio.test/rpc/inbox:recordMessage', STUDIO_INBOX_TOKEN: 'tok' })
    expect(services.emailService).toBeDefined()
    await services.emailService.send({ from: 'a@b.c', to: 'ada@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(sent).toHaveLength(1)
    expect(sent[0]!.url).toBe('http://studio.test/rpc/inbox:recordMessage')
    expect(sent[0]!.body.data.token).toBe('tok')
    expect(sent[0]!.body.data.message.channel).toBe('email')
    expect(sent[0]!.body.data.message.to).toEqual(['ada@example.com'])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('either env var missing: emailService is left untouched', async () => {
  const { createPlatformServices } = await import(generate(contributor))
  expect(await createPlatformServices({})).toEqual({})
  expect(await createPlatformServices({ STUDIO_INBOX_URL: 'http://x' })).toEqual({})
  expect(await createPlatformServices({ STUDIO_INBOX_TOKEN: 't' })).toEqual({})
})

test('a package specifier and no template renderer can be chosen for hosted use', () => {
  const hosted = createInboxContributor({ serviceModule: '@pikkustudio/addon-inbox/inbox-email-service', templateRendererModule: null })
  expect(hosted.imports).toEqual(['import { StudioInboxEmailService } from "@pikkustudio/addon-inbox/inbox-email-service"'])
  expect(hosted.emit({ ctx: {} as never, platform: {} as never, isGateway: false }).join('\n')).not.toContain('import(')
})
