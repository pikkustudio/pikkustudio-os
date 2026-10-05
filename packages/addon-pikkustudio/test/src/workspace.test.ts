import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioProjectsService, type AccountProvider, type CloudProject } from '../../src/services/projects.js'

const cloud: CloudProject = { projectId: 'p1', name: 'Bakery', gitRepoUrl: null }

const account = (calls: string[]): AccountProvider => ({
  account: async () => ({ signedIn: true, apiUrl: 'http://fabric', consoleUrl: 'http://fabric' }),
  projects: async () => [cloud],
  startSignIn: async () => ({ code: 'ABCD', url: 'http://fabric/cli-auth', expiresAt: new Date().toISOString() }),
  pollSignIn: async () => 'confirmed',
  locate: async () => null,
  adopt: async () => {},
  signOut: async () => {},
  modelAccess: async () => ({ proxyUrl: '', apiKey: '' }),
  link: async () => null,
  workspaceLink: async (projectId) => {
    calls.push(projectId)
    return { state: 'ready', url: `https://ws-${projectId}.example.test` }
  },
})

const repo = async (base: string, name: string) => {
  const path = join(base, name)
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'package.json'), JSON.stringify({ name }))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: path })
  return path
}

describe('workspaces', () => {
  test('a cloud project asks Fabric where its workspace is served', async () => {
    const calls: string[] = []
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-ws-'))
    const service = new StudioProjectsService({ account: account(calls), home: join(base, 'studio'), startApps: false })
    assert.deepStrictEqual(await service.workspaceLink('cloud:p1'), { state: 'ready', url: 'https://ws-p1.example.test' })
    assert.deepStrictEqual(calls, ['p1'])
    await assert.rejects(service.workspaceLink('local-one'), /Only a cloud project/)
  })

  test('a pinned studio lists and opens only its own project', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-ws-'))
    const mine = await repo(base, 'mine')
    const other = await repo(base, 'other')
    const service = new StudioProjectsService({
      account: account([]),
      home: join(base, 'studio'),
      currentRoot: mine,
      pinned: true,
      startApps: false,
    })
    await service.add(mine, 'app')
    await service.add(other, 'other')
    const listed = await service.list()
    assert.deepStrictEqual(listed.map((p) => p.key), ['app'])
    await assert.rejects(service.open('other'), /single project/)
  })
})
