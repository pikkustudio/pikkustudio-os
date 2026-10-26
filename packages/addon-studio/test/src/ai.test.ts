import assert from 'node:assert'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioAi, aiSecretName, type AiSecretStore } from '../../src/services/ai.js'

const home = () => mkdtemp(join(tmpdir(), 'pikku-studio-ai-'))

const store = () => {
  const values = new Map<string, string>()
  const secrets: AiSecretStore = {
    has: async (n) => values.has(n),
    get: async (n) => values.get(n)!,
    set: async (n, v) => void values.set(n, v),
  }
  return { values, secrets }
}

describe('StudioAi', () => {
  test('a key choice hands the project its key, base URL and model', async () => {
    const ai = new StudioAi(await home(), store().secrets)
    assert.equal(await ai.choice(), null)
    const choice = await ai.set({ kind: 'key', provider: 'anthropic', apiKey: ' sk-ant ' })
    assert.deepEqual(choice, { kind: 'key', provider: 'anthropic', model: 'claude-haiku-4-5' })
    const env = await ai.env()
    assert.equal(env.ANTHROPIC_API_KEY, 'sk-ant')
    assert.equal(env.PIKKU_STUDIO_AI_KEY, 'sk-ant')
    assert.equal(env.PIKKU_STUDIO_AI_BASE_URL, 'https://api.anthropic.com/v1')
    assert.equal(env.OPENAI_API_KEY, undefined)
  })

  test('a saved key lands in the secret store; ai.json holds only the choice and no ai-keys.json exists', async () => {
    const dir = await home()
    const { values, secrets } = store()
    const ai = new StudioAi(dir, secrets)
    await ai.set({ kind: 'key', provider: 'openai', apiKey: 'sk-1', model: 'gpt-5-mini' })
    assert.equal(values.get(aiSecretName('openai')), 'sk-1')
    assert.equal(aiSecretName('openai'), 'AI_OPENAI_API_KEY')
    assert.deepEqual(await readdir(dir), ['ai.json'])
    const file = await readFile(join(dir, 'ai.json'), 'utf8')
    assert.doesNotMatch(file, /sk-1/)
    assert.deepEqual(Object.keys(JSON.parse(file)), ['choice'])
    assert.equal((await ai.env()).PIKKU_STUDIO_MODEL, 'gpt-5-mini')
    assert.equal(await ai.chatKey(), 'sk-1')
    assert.equal(await ai.hasKey('openai'), true)
    assert.equal(await ai.hasKey('groq'), false)
  })

  test('never reads an old ai-keys.json and refuses a key without a secret store', async () => {
    const dir = await home()
    await writeFile(join(dir, 'ai-keys.json'), JSON.stringify({ openai: 'old' }))
    await writeFile(join(dir, 'ai.json'), JSON.stringify({ choice: { kind: 'key', provider: 'openai', model: 'm' } }))
    const ai = new StudioAi(dir, store().secrets)
    assert.deepEqual(await ai.env(), {})
    assert.equal(await ai.chatKey(), undefined)
    await assert.rejects(new StudioAi(await home()).set({ kind: 'key', provider: 'openai', apiKey: 'x' }), /secret store/)
    assert.deepEqual((await readdir(dir)).sort(), ['ai-keys.json', 'ai.json'])
  })

  test('refuses an unknown provider, an empty key and a Claude subscription', async () => {
    const ai = new StudioAi(await home())
    await assert.rejects(ai.set({ kind: 'key', provider: 'nope', apiKey: 'x' }))
    await assert.rejects(ai.set({ kind: 'key', provider: 'openai', apiKey: ' ' }))
    await assert.rejects(ai.set({ kind: 'subscription', provider: 'anthropic' }))
  })

  test('a subscription or a source account passes no key', async () => {
    const ai = new StudioAi(await home())
    await ai.set({ kind: 'subscription', provider: 'openai-codex' })
    assert.deepEqual(await ai.env(), { PIKKU_STUDIO_AI: 'subscription', PIKKU_STUDIO_AI_PROVIDER: 'openai-codex' })
    await ai.set({ kind: 'source', source: 'host' })
    assert.deepEqual(await ai.env(), { PIKKU_STUDIO_AI: 'source', PIKKU_STUDIO_AI_SOURCE: 'host' })
  })
})
