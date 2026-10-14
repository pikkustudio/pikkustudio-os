import { describe, expect, test } from 'bun:test'
import { modelTranslate } from './translate.js'

const access = async () => ({ url: 'https://model.test/v1/', key: 'k', model: 'm' })

const replying = (content: (asked: Record<string, string>) => string, calls: string[] = []) =>
  (async (url: string, init: RequestInit) => {
    calls.push(url)
    const asked = JSON.parse(JSON.parse(init.body as string).messages[0].content.split('\n').at(-1))
    return Response.json({ choices: [{ message: { content: content(asked) } }] })
  }) as unknown as typeof fetch

describe('modelTranslate', () => {
  test('translates in batches and keeps only the keys it was asked for', async () => {
    const texts = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, `hello ${i}`]))
    const calls: string[] = []
    const translate = modelTranslate(
      access,
      replying((asked) => '```json\n' + JSON.stringify({ ...Object.fromEntries(Object.entries(asked).map(([k, v]) => [k, `hallo ${v.slice(6)}`])), extra: 'x' }) + '\n```', calls)
    )
    const out = await translate(texts, 'de', 'en')
    expect(calls).toEqual(['https://model.test/v1/chat/completions', 'https://model.test/v1/chat/completions'])
    expect(Object.keys(out).length).toBe(100)
    expect(out.k42).toBe('hallo 42')
    expect(out.extra).toBeUndefined()
  })

  test('never throws: no AI, a failed call or nonsense gives no translations', async () => {
    expect(await modelTranslate(async () => null)({ a: 'b' }, 'de', 'en')).toEqual({})
    expect(await modelTranslate(access, (async () => new Response('no', { status: 500 })) as unknown as typeof fetch)({ a: 'b' }, 'de', 'en')).toEqual({})
    expect(await modelTranslate(access, replying(() => 'sorry'))({ a: 'b' }, 'de', 'en')).toEqual({})
    expect(await modelTranslate(access, (async () => { throw new Error('offline') }) as unknown as typeof fetch)({ a: 'b' }, 'de', 'en')).toEqual({})
  })
})
