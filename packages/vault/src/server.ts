import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { join } from 'node:path'
import {
  keyIdFor,
  parseSealedValue,
  unseal,
  type SealingKeypair,
} from './sealed-box.js'
import { vaultKeypair } from './vault-key.js'
import { openVaultDb, sameToken, SqliteAuditService, VaultStore } from './store.js'

export const vaultPaths = (home: string) => ({
  socket: join(home, 'vault.sock'),
  db: join(home, 'vault.db'),
  adminToken: join(home, 'vault-admin-token'),
})

const adminToken = (file: string): string => {
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  const token = randomBytes(32).toString('base64url')
  writeFileSync(file, token, { mode: 0o600 })
  chmodSync(file, 0o600)
  return token
}

const socketLive = (path: string): Promise<boolean> =>
  new Promise((resolve) => {
    const probe = connect(path)
    probe.once('connect', () => {
      probe.destroy()
      resolve(true)
    })
    probe.once('error', () => resolve(false))
  })

const readBody = async (req: IncomingMessage): Promise<any> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

export interface RunningVault {
  server: Server
  socket: string
  close(): Promise<void>
}

export const startVault = async (home: string): Promise<RunningVault | null> => {
  const paths = vaultPaths(home)
  if (existsSync(paths.socket)) {
    if (await socketLive(paths.socket)) return null
    unlinkSync(paths.socket)
  }

  const keypair: SealingKeypair = vaultKeypair(home)
  const keyId = keyIdFor(keypair.publicKey)
  const db = openVaultDb(paths.db)
  const store = new VaultStore(db)
  const audit = new SqliteAuditService(db)
  const admin = adminToken(paths.adminToken)

  const record = (caller: string, type: string, key: string | undefined, outcome: 'success' | 'denied' | 'failed') =>
    audit.audit({
      type,
      source: 'explicit',
      outcome,
      occurredAt: new Date().toISOString(),
      userIdentity: { userId: caller },
      metadata: key ? { key } : undefined,
    })

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const bearer = (req.headers.authorization ?? '').replace(/^Bearer /, '')
    const isAdmin = bearer !== '' && sameToken(bearer, admin)
    const scoped = isAdmin || bearer === '' ? undefined : store.token(bearer)
    if (!isAdmin && !scoped) return send(res, 401, { error: 'unauthorized' })
    const caller = isAdmin ? 'admin' : scoped!.name
    const canRead = (key: string) => isAdmin || scoped!.keys === '*' || scoped!.keys.includes(key)

    const url = new URL(req.url ?? '/', 'http://vault')
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const [, resource, key, action] = parts
    const method = req.method ?? 'GET'

    if (parts[0] !== 'v1') return send(res, 404, { error: 'not_found' })

    if (resource === 'public-key' && method === 'GET') {
      return send(res, 200, { publicKey: keypair.publicKey, keyId })
    }

    if (resource === 'secrets' && key) {
      const own = scoped ? `${scoped.name}:${key}` : undefined
      const stored = own && store.has(own) ? own : key
      if (action === 'exists' && method === 'GET') {
        return send(res, 200, { exists: canRead(key) && store.has(stored) })
      }
      if (method === 'GET') {
        if (!canRead(key)) {
          await record(caller, 'secret.read', key, 'denied')
          return send(res, 403, { error: 'forbidden' })
        }
        const row = store.sealed(stored)
        if (!row) return send(res, 404, { error: 'not_found' })
        const value = unseal(keypair.privateKey, parseSealedValue(row.sealed))
        await record(caller, 'secret.read', stored, 'success')
        return send(res, 200, { value })
      }
      if (!isAdmin) {
        await record(caller, `secret.${method === 'PUT' ? 'write' : 'delete'}`, key, 'denied')
        return send(res, 403, { error: 'forbidden' })
      }
      if (method === 'PUT') {
        const body = await readBody(req)
        const parsed = parseSealedValue(String(body.sealed))
        if (parsed.kid !== keyId) {
          await record(caller, 'secret.write', key, 'failed')
          return send(res, 400, { error: 'sealed_to_wrong_key' })
        }
        store.put(key, body.sealed, keyId)
        await record(caller, 'secret.write', key, 'success')
        return send(res, 200, { ok: true })
      }
      if (method === 'DELETE') {
        const removed = store.delete(key)
        await record(caller, 'secret.delete', key, 'success')
        return send(res, 200, { removed })
      }
    }

    if (isAdmin && resource === 'keys' && method === 'GET') {
      return send(res, 200, { keys: store.keys() })
    }

    if (isAdmin && resource === 'tokens' && method === 'POST') {
      const body = await readBody(req)
      const token = randomBytes(32).toString('base64url')
      store.addToken(token, { name: String(body.name), keys: body.keys === '*' ? '*' : [...body.keys] })
      await record(caller, 'token.mint', String(body.name), 'success')
      return send(res, 200, { token })
    }

    if (isAdmin && resource === 'audit' && method === 'GET') {
      const result = await audit.query({
        limit: Number(url.searchParams.get('limit') ?? 50),
        offset: Number(url.searchParams.get('offset') ?? 0),
      })
      return send(res, 200, { ...result, intact: audit.verify() })
    }

    return send(res, 404, { error: 'not_found' })
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, { error: error instanceof Error ? error.message : 'internal' })
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(paths.socket, () => {
      chmodSync(paths.socket, 0o600)
      resolve()
    })
  })

  return {
    server,
    socket: paths.socket,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          db.close()
          resolve()
        })
      }),
  }
}
