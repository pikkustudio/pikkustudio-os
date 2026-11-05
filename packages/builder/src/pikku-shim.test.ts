import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { writePikkuShim } from './changes.js'

const tree = () => mkdtempSync(join(tmpdir(), 'pikku-shim-'))

describe('pikku shim', () => {
  test('runs the CLI of the project it is called from, from any folder inside it', async () => {
    const root = tree()
    const project = join(root, 'project')
    const nested = join(project, 'packages', 'functions')
    mkdirSync(nested, { recursive: true })
    mkdirSync(join(project, 'node_modules', '.bin'), { recursive: true })
    const cli = join(project, 'node_modules', '.bin', 'pikku')
    writeFileSync(cli, 'console.log("project", process.argv.slice(2).join(" "))\n', { mode: 0o755 })

    const dir = await writePikkuShim(join(root, 'home'))
    const output = execFileSync(join(dir, 'pikku'), ['doc', 'workflow'], { cwd: nested }).toString()

    expect(output.trim()).toBe('project doc workflow')
  })

  test('falls back to the CLI Studio ships, and keeps the queue HOME', async () => {
    const root = tree()
    const dir = await writePikkuShim(join(root, 'home'), '/queue/home')
    const shim = readFileSync(join(dir, 'pikku'), 'utf8')

    expect(shim).toContain('export HOME="/queue/home"')
    expect(shim).toMatch(/\nexec .*"\$@"\n$/)
  })
})
