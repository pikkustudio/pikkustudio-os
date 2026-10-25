import { test, expect } from 'bun:test'
import { inboxContributor } from './inbox.contributor.js'

const run = async (env: Record<string, string | undefined>) => {
  const services: Record<string, any> = {}
  await inboxContributor.run(services, env, {}, {} as never)
  return services
}

test('both env vars set: installs the capturing email service', async () => {
  const sent: { url: string; body: any }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    sent.push({ url, body: JSON.parse(init.body) })
    return new Response(JSON.stringify({ id: 'x' }), { status: 200 })
  }) as never
  try {
    const services = await run({ STUDIO_INBOX_URL: 'http://studio.test/rpc/inbox:recordMessage', STUDIO_INBOX_TOKEN: 'tok' })
    expect(services.emailService).toBeDefined()
    const result = await services.emailService.send({ from: 'a@b.c', to: 'ada@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(result).toEqual({ messageId: 'x' })
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
  expect(await run({})).toEqual({})
  expect(await run({ STUDIO_INBOX_URL: 'http://x' })).toEqual({})
  expect(await run({ STUDIO_INBOX_TOKEN: 't' })).toEqual({})
})

test('the deploy ref is read from the env on every send', async () => {
  const sent: any[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }) as never
  try {
    const env: Record<string, string | undefined> = { STUDIO_INBOX_URL: 'http://x', STUDIO_INBOX_TOKEN: 't' }
    const services = await run(env)
    await services.emailService.send({ to: 'a@b.c', subject: 's' })
    env.STUDIO_INBOX_DEPLOY_REF = 'abc123'
    await services.emailService.send({ to: 'a@b.c', subject: 's' })
    expect(sent.map((s) => s.data.message.deployRef)).toEqual([null, 'abc123'])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a template send with no html still records the template name and its data', async () => {
  const sent: any[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }) as never
  try {
    const services = await run({ STUDIO_INBOX_URL: 'http://x', STUDIO_INBOX_TOKEN: 't' })
    await services.emailService.send({ to: 'a@b.c', template: { name: 'welcome', locale: 'de', data: { n: 1 } } })
    expect(sent[0].data.message).toMatchObject({ subject: 'welcome', templateName: 'welcome', templateLocale: 'de', html: null })
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a failed hand-over warns and returns no message id', async () => {
  const realFetch = globalThis.fetch
  const realWarn = console.warn
  const warned: unknown[][] = []
  console.warn = (...args: unknown[]) => void warned.push(args)
  globalThis.fetch = (async () => new Response('no', { status: 500 })) as never
  try {
    const services = await run({ STUDIO_INBOX_URL: 'http://x', STUDIO_INBOX_TOKEN: 't' })
    expect(await services.emailService.send({ to: 'a@b.c', subject: 's' })).toEqual({})
    expect(warned[0]![0]).toBe('Could not hand a message to the inbox:')
  } finally {
    globalThis.fetch = realFetch
    console.warn = realWarn
  }
})
