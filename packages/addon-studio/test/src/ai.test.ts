import assert from 'node:assert'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioSettingsStore, type StudioSettings } from '../../src/services/settings.js'
import { memorySetting } from '../../src/services/setting-store.js'
import { StudioAi, aiSecretName, memoryAiChoiceStore, type AiChoice, type AiSecretStore } from '../../src/services/ai.js'

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
    const ai = new StudioAi(store().secrets)
    assert.equal(await ai.choice(), null)
    const choice = await ai.set({ kind: 'key', provider: 'anthropic', apiKey: ' sk-ant ' })
    assert.deepEqual(choice, { kind: 'key', provider: 'anthropic', model: 'claude-haiku-4-5' })
    const env = await ai.env()
    assert.equal(env.ANTHROPIC_API_KEY, 'sk-ant')
    assert.equal(env.PIKKU_STUDIO_AI_KEY, 'sk-ant')
    assert.equal(env.PIKKU_STUDIO_AI_BASE_URL, 'https://api.anthropic.com/v1')
    assert.equal(env.OPENAI_API_KEY, undefined)
  })

  test('a saved key lands in the secret store and the choice in the choice store; no file is written in home', async () => {
    const dir = await home()
    const { values, secrets } = store()
    const held = memoryAiChoiceStore()
    const ai = new StudioAi(secrets, held)
    await ai.set({ kind: 'key', provider: 'openai', apiKey: 'sk-1', model: 'gpt-5-mini' })
    assert.equal(values.get(aiSecretName('openai')), 'sk-1')
    assert.equal(aiSecretName('openai'), 'AI_OPENAI_API_KEY')
    assert.doesNotMatch(JSON.stringify(await held.get()), /sk-1/)
    assert.deepEqual(await readdir(dir), [])
    assert.equal((await ai.env()).PIKKU_STUDIO_MODEL, 'gpt-5-mini')
    assert.equal(await ai.chatKey(), 'sk-1')
    assert.equal(await ai.hasKey('openai'), true)
    assert.equal(await ai.hasKey('groq'), false)
  })

  test('the choice round-trips through the store, a fresh instance loads it, and an absent choice is null', async () => {
    const held = memoryAiChoiceStore()
    assert.equal(await new StudioAi(undefined, held).choice(), null)
    await new StudioAi(undefined, held).set({ kind: 'source', source: 'host' })
    const again = new StudioAi(undefined, held)
    await again.load()
    assert.deepEqual(await held.get(), { kind: 'source', source: 'host' } satisfies AiChoice)
    assert.equal(again.usesSource(), 'host')
    await again.clear()
    assert.equal(await held.get(), null)
    assert.equal(again.usesSource(), null)
  })

  test('a key choice without a secret in the store gives no env and no chat key, and a key is refused without a secret store', async () => {
    const held = memoryAiChoiceStore()
    await held.set({ kind: 'key', provider: 'openai', model: 'm' })
    const ai = new StudioAi(store().secrets, held)
    assert.deepEqual(await ai.env(), {})
    assert.equal(await ai.chatKey(), undefined)
    await assert.rejects(new StudioAi().set({ kind: 'key', provider: 'openai', apiKey: 'x' }), /secret store/)
  })

  test('refuses an unknown provider, an empty key and a Claude subscription', async () => {
    const ai = new StudioAi()
    await assert.rejects(ai.set({ kind: 'key', provider: 'nope', apiKey: 'x' }))
    await assert.rejects(ai.set({ kind: 'key', provider: 'openai', apiKey: ' ' }))
    await assert.rejects(ai.set({ kind: 'subscription', provider: 'anthropic' }))
  })

  test('a subscription or a source account passes no key', async () => {
    const ai = new StudioAi()
    await ai.set({ kind: 'subscription', provider: 'openai-codex' })
    assert.deepEqual(await ai.env(), { PIKKU_STUDIO_AI: 'subscription', PIKKU_STUDIO_AI_PROVIDER: 'openai-codex' })
    await ai.set({ kind: 'source', source: 'host' })
    assert.deepEqual(await ai.env(), { PIKKU_STUDIO_AI: 'source', PIKKU_STUDIO_AI_SOURCE: 'host' })
  })
})

describe('StudioSettingsStore', () => {
  test('reads defaults, merges updates and keeps them in the setting store', async () => {
    const held = memorySetting<Partial<StudioSettings>>()
    const settings = new StudioSettingsStore(held)
    assert.deepEqual(await settings.read(), { signIn: null, name: null, about: null })
    await settings.update({ name: 'Ada' })
    await settings.update({ signIn: 'local' })
    assert.deepEqual(await new StudioSettingsStore(held).read(), { signIn: 'local', name: 'Ada', about: null })
  })
})
