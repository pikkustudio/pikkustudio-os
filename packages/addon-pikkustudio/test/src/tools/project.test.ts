import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeZip, serveFiles, sha256, tempDir, testManifest } from './fixtures.js'
import { declaredTools, declareTool } from '../../../src/lib/tools/project.js'
import { ToolResolver } from '../../../src/lib/tools/resolver.js'

const archive = makeZip([{ name: 'shell/chrome-headless-shell', data: '#!/bin/sh\necho "Chromium 154.0.8037.92"\n', mode: 0o644 }])
let server: ReturnType<typeof serveFiles>

afterEach(() => server?.stop())

const project = (config: string) => {
  const dir = tempDir('studio-project-')
  writeFileSync(join(dir, 'pikku.config.json'), config)
  return dir
}

const read = (dir: string) => readFileSync(join(dir, 'pikku.config.json'), 'utf8')

const resolver = (projectDir: string | undefined, autoInstall: string[], messages: string[] = []) => {
  server = serveFiles({ '/shell.zip': archive })
  return new ToolResolver({
    home: tempDir(),
    manifest: testManifest({ 'linux-x64': { url: server.url('/shell.zip'), sha256: sha256(archive), size: archive.length } }),
    platform: 'linux-x64',
    searchPath: '',
    autoInstall,
    projectDir: () => projectDir,
    onDeclared: (message) => messages.push(message),
  })
}

describe('declared tools file', () => {
  test('adds the key at the end and keeps indentation, key order and trailing newline', () => {
    const dir = project('{\n    "b": 1,\n    "a": { "x": [1, 2] }\n}\n')
    expect(declareTool(dir, { id: 'ghidra' })).toBe(true)
    expect(read(dir)).toBe('{\n    "b": 1,\n    "a": {\n        "x": [\n            1,\n            2\n        ]\n    },\n    "tools": [\n        {\n            "id": "ghidra"\n        }\n    ]\n}\n')
    expect(Object.keys(JSON.parse(read(dir)))).toEqual(['b', 'a', 'tools'])
  })

  test('is idempotent per id and keeps what the project already declared', () => {
    const dir = project('{"tools":[{"id":"jdk","version":">=21"}]}')
    expect(declareTool(dir, { id: 'jdk', version: '17' })).toBe(false)
    expect(declareTool(dir, { id: 'ghidra' })).toBe(true)
    expect(declareTool(dir, { id: 'ghidra' })).toBe(false)
    expect(declaredTools(dir)).toEqual([{ id: 'jdk', version: '>=21' }, { id: 'ghidra' }])
  })

  test('does nothing without a project or a readable config', () => {
    expect(declareTool(undefined, { id: 'ghidra' })).toBe(false)
    expect(declareTool(tempDir(), { id: 'ghidra' })).toBe(false)
    expect(declaredTools(project('not json'))).toEqual([])
  })
})

describe('resolver and the project', () => {
  test('a successful install is recorded, a found tool is not', async () => {
    const dir = project('{"name":"app"}\n')
    await resolver(dir, []).install('chromium')
    expect(declaredTools(dir)).toEqual([{ id: 'chromium' }])
    const other = project('{}')
    await resolver(other, ['chromium']).ensure([{ tool: 'chromium', requestedBy: 'test' }])
    expect(declaredTools(other)).toEqual([])
  })

  test('a failed install records nothing', async () => {
    const dir = project('{}')
    const tools = resolver(dir, [])
    await expect(tools.install('chromium', '0.0.0')).rejects.toThrow()
    expect(declaredTools(dir)).toEqual([])
  })

  test('boot ensure installs declared tools inside the allow-list and leaves the rest as needs', async () => {
    const messages: string[] = []
    const dir = project('{"tools":[{"id":"chromium"}]}')
    const allowed = resolver(dir, ['chromium'], messages)
    await allowed.ensureDeclared()
    expect(messages).toEqual(['tool chromium ready (installed 154.0.8037.92)'])

    const refused: string[] = []
    const blocked = resolver(dir, [], refused)
    await blocked.ensureDeclared()
    expect(refused).toEqual(['tool chromium needed by the project, not in the auto-install list'])
    expect((await blocked.list()).find((tool) => tool.id === 'chromium')).toMatchObject({ declared: true, status: 'missing' })
  })

  test('an unknown declared tool is logged, never thrown', async () => {
    const messages: string[] = []
    await resolver(project('{"tools":[{"id":"nope"}]}'), [], messages).ensureDeclared()
    expect(messages).toEqual(['tool nope failed: Unknown tool: nope'])
  })

  test('list marks undeclared tools false', async () => {
    const tools = await resolver(project('{}'), []).list()
    expect(tools.every((tool) => tool.declared === false)).toBe(true)
  })
})
