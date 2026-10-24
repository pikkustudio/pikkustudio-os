import assert from 'node:assert'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { functionsMetaFile } from '../../src/services/projects.js'

const META = join('function', 'pikku-functions-meta-verbose.gen.json')

test('the meta sits under .pikku when the config names no outDir', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-file-'))
  assert.strictEqual(functionsMetaFile(dir), join(dir, '.pikku', META))
  await writeFile(join(dir, 'pikku.config.json'), JSON.stringify({ srcDirectories: ['src'] }))
  assert.strictEqual(functionsMetaFile(dir), join(dir, '.pikku', META))
})

test("the meta follows the config's outDir, as the monorepo template sets it", async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-file-'))
  await writeFile(join(dir, 'pikku.config.json'), JSON.stringify({ rootDir: '.', outDir: 'packages/functions/.pikku' }))
  assert.strictEqual(functionsMetaFile(dir), join(dir, 'packages', 'functions', '.pikku', META))
})
