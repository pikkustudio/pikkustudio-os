import { createSecretValue, type SecretValue } from '@pikku/core/classification'
import type { SecretService, SecretValues } from '@pikku/core/services'
import { resolve, type Layer } from './layers.js'

export const PERSONAL = 'personal'
export const TEAM = 'team'
export const PROJECT = 'project'

export class LayeredSecretService implements SecretService {
  constructor(
    private layers: Layer<unknown>[],
    private target: string = PERSONAL,
  ) {}

  async getSecret<T = string>(key: string): Promise<SecretValue<T>> {
    const found = await resolve(this.layers, key)
    if (!found) throw new Error(`Requested secret not found: ${key}`)
    return createSecretValue(found.value as T)
  }

  async hasSecret(key: string) {
    return (await resolve(this.layers, key)) !== undefined
  }

  async whichLayer(key: string) {
    return (await resolve(this.layers, key))?.layer
  }

  async setSecret(key: string, value: unknown) {
    const layer = this.layers.find((l) => l.name === this.target)
    if (!layer?.set) throw new Error(`The ${this.target} layer is read only`)
    await layer.set(key, value)
  }

  async deleteSecret(key: string) {
    const layer = this.layers.find((l) => l.name === this.target)
    if (!layer?.delete) throw new Error(`The ${this.target} layer is read only`)
    await layer.delete(key)
  }

  async getSecrets<T extends Record<string, unknown> = Record<string, unknown>>(keys: (keyof T & string)[]) {
    const out: Record<string, unknown> = {}
    for (const key of keys) {
      const found = await resolve(this.layers, key)
      if (found) out[key] = createSecretValue(found.value)
    }
    return out as Partial<SecretValues<T>>
  }
}

export const fromSecretService = (name: string, service: SecretService): Layer<unknown> => ({
  name,
  async get(key) {
    if (!(await service.hasSecret(key))) return undefined
    return (await service.getSecret(key)).reveal()
  },
  set: (key, value) => service.setSecret(key, value),
  delete: (key) => service.deleteSecret(key),
})
