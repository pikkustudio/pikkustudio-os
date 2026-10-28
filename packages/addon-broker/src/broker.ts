import { BrokerError } from './broker-error.js'
import type { StageContext } from './stage-context.js'
import type { StageDirectory } from './stage-directory.interface.js'

export interface InvokeInput {
  apiKey: string
  /** The app's user making the call; selects a per-user credential, else the stage-wide one. */
  userId?: string | null
  connector: string
  fn: string
  body: unknown
}

export interface BrokerOptions {
  directory: StageDirectory
  connectorUrl: (connector: string) => string | null
  fetch?: typeof fetch
  credentialTtlMs?: number
  now?: () => number
}

interface CachedCredential {
  credential: Promise<string>
  expiresAt: number
}

export class Broker {
  private cache = new Map<string, CachedCredential>()

  constructor(private options: BrokerOptions) {}

  private credentialFor(stage: StageContext, connector: string, userId: string | null): Promise<string> {
    const now = (this.options.now ?? Date.now)()
    const cacheKey = `${stage.projectId}:${stage.stage}:${connector}:${userId ?? ''}`
    const hit = this.cache.get(cacheKey)
    if (hit && hit.expiresAt > now) return hit.credential

    const credential = this.loadCredential(stage, connector, userId)
    this.cache.set(cacheKey, { credential, expiresAt: now + (this.options.credentialTtlMs ?? 60_000) })
    credential.catch(() => this.cache.delete(cacheKey))
    return credential
  }

  private async loadCredential(stage: StageContext, connector: string, userId: string | null): Promise<string> {
    const credential = await stage.credentials.get(connector, userId)
    if (credential === null) throw new BrokerError(404, `${connector} is not connected for this project`)
    return credential
  }

  async invoke(input: InvokeInput): Promise<Response> {
    const { directory, connectorUrl } = this.options
    const send = this.options.fetch ?? fetch

    const stage = await directory.resolve(input.apiKey)
    if (!stage) throw new BrokerError(401, 'unknown api key')
    if (!stage.allowedConnectors.includes(input.connector)) {
      throw new BrokerError(403, `${input.connector} is not allowed for this project`)
    }

    const target = connectorUrl(input.connector)
    if (!target) throw new BrokerError(404, `no connector ${input.connector}`)

    const credential = await this.credentialFor(stage, input.connector, input.userId ?? null)

    return send(`${target}/rpc/${encodeURIComponent(input.fn)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${credential}` },
      body: JSON.stringify(input.body),
    })
  }
}
