import assert from 'node:assert'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { commitPaths, createLayout } from '../../src/services/worktree.js'

test('creating a project layout never races git background maintenance', async () => {
  const home = await mkdtemp(join(tmpdir(), 'layout-race-'))
  for (let n = 0; n < 15; n++) {
    const root = join(home, `p${n}`)
    const scaffold = join(root, '.scaffold', 'app')
    await mkdir(join(scaffold, 'src'), { recursive: true })
    for (let f = 0; f < 200; f++) await writeFile(join(scaffold, 'src', `f${f}.ts`), `export const v${f} = ${n * f}\n`)
    await commitPaths(scaffold, ['.'], 'Start')
    await assert.doesNotReject(createLayout(root, scaffold, home), `layout ${n}`)
  }
})
