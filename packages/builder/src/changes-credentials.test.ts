import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { pikkuNext } from './changes.js'

describe('pikku changes with the sandbox credentials', () => {
  test('reads the queue from the cloud with the bridged token and project', async () => {
    const seen: { url?: string; auth?: string; body: string }[] = []
    const server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        seen.push({ url: req.url, auth: req.headers.authorization, body })
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ changes: [], groups: [], projects: [] }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const dir = await mkdtemp(join(tmpdir(), 'pikku-creds-'))
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: dir })
    try {
      const route = await pikkuNext(dir, undefined, undefined, {
        HOME: dir,
        PIKKUSTUDIO_API_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        PIKKUSTUDIO_API_KEY: 'sandbox-token',
        PIKKUSTUDIO_PROJECT_ID: 'project-1',
      })
      assert.equal(route.agent, null)
      assert.ok(seen.length > 0)
      for (const call of seen) {
        assert.equal(call.url, '/rpc/listChanges')
        assert.equal(call.auth, 'Bearer sandbox-token')
        assert.equal(JSON.parse(call.body).data.projectId, 'project-1')
      }
    } finally {
      server.close()
    }
  })
})
