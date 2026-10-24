import assert from 'node:assert'
import { createServer } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { builderModels, setBuilderModel, transcribeAudio } from '../../src/functions/composer.function.js'
import { StudioAi } from '../../src/services/ai.js'
import { tierOf } from '../../src/lib/composer.js'

const call = (fn: unknown, services: object, input: object) => (fn as { func: (s: object, i: object, w: object) => Promise<any> }).func(services, input, {})

const proxy = async () => {
  const seen: { path: string; auth?: string }[] = []
  const server = createServer((req, res) => {
    seen.push({ path: req.url ?? '', auth: req.headers.authorization })
    res.setHeader('content-type', 'application/json')
    if (req.url === '/v1/models') res.end(JSON.stringify({ data: [{ id: 'deepseek-v4.1-flash' }, { id: 'gpt-5.6-luna' }, { id: 'claude-opus-5' }, { id: 'gpt-4o-transcribe' }, { id: 'text-embedding-3' }] }))
    else if (req.url === '/v1/audio/transcriptions') res.end(JSON.stringify({ text: ' hello there ' }))
    else res.writeHead(404).end('{}')
  })
  await new Promise<void>((ok) => server.listen(0, ok))
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  return { url, seen, close: () => server.close() }
}

describe('composer functions', () => {
  test('tiers read from the model name', () => {
    assert.equal(tierOf('deepseek-v4.1-flash'), 'fast')
    assert.equal(tierOf('claude-opus-5'), 'best')
    assert.equal(tierOf('gpt-5.6-luna'), 'balanced')
  })

  test('lists chat models only, remembers a choice per project, and transcribes through the same endpoint', async () => {
    const fake = await proxy()
    try {
      const home = await mkdtemp(join(tmpdir(), 'pikku-composer-'))
      const studioAi = new StudioAi(home)
      await studioAi.set({ kind: 'key', provider: 'litellm', apiKey: 'sk-x', baseUrl: fake.url, model: 'deepseek-v4.1-flash' })
      const services = { studioAi, studioProjects: {}, studioModels: new Map<string, string>() }

      const listed = await call(builderModels, services, { key: 'p' })
      assert.deepEqual(listed.models.map((m: { id: string }) => m.id), ['deepseek-v4.1-flash', 'gpt-5.6-luna', 'claude-opus-5'])
      assert.equal(listed.current, 'deepseek-v4.1-flash')

      await call(setBuilderModel, services, { key: 'p', model: 'claude-opus-5' })
      assert.equal(services.studioModels.get('p'), 'claude-opus-5')
      assert.equal((await call(builderModels, services, { key: 'p' })).current, 'claude-opus-5')
      await call(setBuilderModel, services, { key: 'p', model: '' })
      assert.equal(services.studioModels.has('p'), false)

      const text = await call(transcribeAudio, services, { audioBase64: Buffer.alloc(3000).toString('base64'), format: 'webm', language: 'de' })
      assert.equal(text.text, 'hello there')
      assert.equal(fake.seen.at(-1)?.auth, 'Bearer sk-x')
      await assert.rejects(call(transcribeAudio, services, { audioBase64: 'AAAA', format: 'webm' }), /too short/)
    } finally {
      fake.close()
    }
  })
})
