import { request } from 'node:http'

export interface VaultConnection {
  socketPath: string
  token: string
}

export interface VaultResponse<T = any> {
  status: number
  body: T
}

export const vaultCall = <T = any>(
  connection: VaultConnection,
  method: string,
  path: string,
  body?: unknown
): Promise<VaultResponse<T>> =>
  new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const req = request(
      {
        socketPath: connection.socketPath,
        path,
        method,
        headers: {
          authorization: `Bearer ${connection.token}`,
          ...(payload ? { 'content-type': 'application/json' } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : {} })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })

export const vaultFailure = (response: VaultResponse, action: string): Error =>
  new Error(`Vault ${action} failed (${response.status}): ${response.body?.error ?? 'unknown'}`)
