import { createSecretValue, type SecretValue } from '@pikku/core/classification'
import type { SecretService, SecretValues } from '@pikku/core/services'
import { seal, serializeSealedValue } from './sealed-box.js'
import { vaultCall, vaultFailure, type VaultResponse } from './http.js'

export interface VaultClientOptions {
  socketPath: string
  token: string
  fallback?: SecretService
}

export class VaultClientSecretService implements SecretService {
  private publicKey?: { publicKey: string; keyId: string }

  constructor(private options: VaultClientOptions) {}

  private call<T = any>(method: string, path: string, body?: unknown): Promise<VaultResponse<T>> {
    return vaultCall<T>(this.options, method, path, body)
  }

  private failure(response: VaultResponse, action: string): Error {
    return vaultFailure(response, action)
  }

  private path(key: string, suffix = ''): string {
    return `/v1/secrets/${encodeURIComponent(key)}${suffix}`
  }

  async getSecret<T = string>(key: string): Promise<SecretValue<T>> {
    const response = await this.call<{ value: string }>('GET', this.path(key))
    if (response.status === 404) {
      if (this.options.fallback) return this.options.fallback.getSecret<T>(key)
      throw new Error(`Requested secret not found: ${key}`)
    }
    if (response.status !== 200) throw this.failure(response, 'read')
    return createSecretValue(JSON.parse(response.body.value) as T)
  }

  async hasSecret(key: string): Promise<boolean> {
    const response = await this.call<{ exists: boolean }>('GET', this.path(key, '/exists'))
    if (response.status !== 200) throw this.failure(response, 'exists')
    if (response.body.exists) return true
    return this.options.fallback ? this.options.fallback.hasSecret(key) : false
  }

  async setSecret(key: string, value: unknown): Promise<void> {
    const { publicKey, keyId } = await this.sealingKey()
    await this.setEncryptedSecret(key, serializeSealedValue(seal(publicKey, keyId, JSON.stringify(value))))
  }

  async setEncryptedSecret(key: string, sealed: string): Promise<void> {
    const response = await this.call('PUT', this.path(key), { sealed })
    if (response.status !== 200) throw this.failure(response, 'write')
  }

  async deleteSecret(key: string): Promise<void> {
    const response = await this.call('DELETE', this.path(key))
    if (response.status !== 200) throw this.failure(response, 'delete')
  }

  async getSecrets<T extends Record<string, unknown> = Record<string, unknown>>(
    keys: (keyof T & string)[]
  ): Promise<Partial<SecretValues<T>>> {
    const result: Record<string, unknown> = {}
    for (const key of keys) {
      if (await this.hasSecret(key)) result[key] = await this.getSecret(key)
    }
    return result as Partial<SecretValues<T>>
  }

  async sealingKey(): Promise<{ publicKey: string; keyId: string }> {
    if (!this.publicKey) {
      const response = await this.call<{ publicKey: string; keyId: string }>('GET', '/v1/public-key')
      if (response.status !== 200) throw this.failure(response, 'public-key')
      this.publicKey = response.body
    }
    return this.publicKey
  }
}
