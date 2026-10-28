import { vaultCall, vaultFailure, type VaultConnection } from './http.js'

export class StageVaultClient {
  constructor(private connection: VaultConnection) {}

  async stageDbUrl(requester: string | null): Promise<string> {
    const response = await vaultCall(this.connection, 'POST', '/v1/stageDbUrl', { requester })
    throw vaultFailure(response, 'stageDbUrl')
  }

  async getVariables(requester: string | null, version?: string): Promise<Record<string, string>> {
    const response = await vaultCall(this.connection, 'POST', '/v1/getVariables', { requester, version })
    throw vaultFailure(response, 'getVariables')
  }

  async getSecrets(requester: string | null, version?: string): Promise<Record<string, string>> {
    const response = await vaultCall(this.connection, 'POST', '/v1/getSecrets', { requester, version })
    throw vaultFailure(response, 'getSecrets')
  }

  async openSealed(requester: string | null, sealed: string): Promise<string> {
    const response = await vaultCall<{ value: string }>(this.connection, 'POST', '/v1/openSealed', {
      requester,
      sealed,
    })
    if (response.status !== 200) throw vaultFailure(response, 'openSealed')
    return response.body.value
  }

  async sealValue(requester: string | null, plaintext: string): Promise<string> {
    const response = await vaultCall<{ sealed: string }>(this.connection, 'POST', '/v1/sealValue', {
      requester,
      plaintext,
    })
    if (response.status !== 200) throw vaultFailure(response, 'sealValue')
    return response.body.sealed
  }
}
