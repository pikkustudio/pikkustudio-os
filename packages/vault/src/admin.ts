import type { AuditQueryResult } from '@pikku/core/services'
import { vaultCall, vaultFailure, type VaultConnection } from './http.js'

export class VaultAdmin {
  constructor(private connection: VaultConnection) {}

  async sealingKey(): Promise<{ publicKey: string; keyId: string }> {
    const response = await vaultCall(this.connection, 'GET', '/v1/public-key')
    if (response.status !== 200) throw vaultFailure(response, 'public-key')
    return response.body
  }

  async keys(): Promise<string[]> {
    const response = await vaultCall(this.connection, 'GET', '/v1/keys')
    if (response.status !== 200) throw vaultFailure(response, 'list')
    return response.body.keys
  }

  async put(key: string, sealed: string): Promise<void> {
    const response = await vaultCall(this.connection, 'PUT', `/v1/secrets/${encodeURIComponent(key)}`, { sealed })
    if (response.status !== 200) throw vaultFailure(response, 'write')
  }

  async remove(key: string): Promise<void> {
    const response = await vaultCall(this.connection, 'DELETE', `/v1/secrets/${encodeURIComponent(key)}`)
    if (response.status !== 200) throw vaultFailure(response, 'delete')
  }

  async mintToken(name: string, keys: string[] | '*'): Promise<string> {
    const response = await vaultCall(this.connection, 'POST', '/v1/tokens', { name, keys })
    if (response.status !== 200) throw vaultFailure(response, 'mint-token')
    return response.body.token
  }

  async activity(limit = 50, offset = 0): Promise<AuditQueryResult & { intact: boolean }> {
    const response = await vaultCall(this.connection, 'GET', `/v1/audit?limit=${limit}&offset=${offset}`)
    if (response.status !== 200) throw vaultFailure(response, 'audit')
    return response.body
  }
}
