import { test, expect } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import contributor from './inbox.contributor.js'

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

test('the emitted file has no imports, so the project can typecheck it under strict', () => {
  const file = generate(contributor)
  const text = readFileSync(file, 'utf8')
  expect(text).not.toMatch(/^\s*import\s/m)
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
  })
  const messages = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  expect(messages).toEqual([])
})

test('a template send with no html still records the template name and its data', async () => {
  const sent: any[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }) as never
  try {
    const { createPlatformServices } = await import(generate(contributor))
    const services = await createPlatformServices({ STUDIO_INBOX_URL: 'http://x', STUDIO_INBOX_TOKEN: 't' })
    await services.emailService.send({ to: 'a@b.c', template: { name: 'welcome', locale: 'de', data: { n: 1 } } })
    expect(sent[0].data.message).toMatchObject({ subject: 'welcome', templateName: 'welcome', templateLocale: 'de', html: null })
  } finally {
    globalThis.fetch = realFetch
  }
})
