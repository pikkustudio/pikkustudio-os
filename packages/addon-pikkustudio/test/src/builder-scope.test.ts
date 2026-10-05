import assert from 'node:assert'
import { mkdtemp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { modeScope } from '../../src/services/builder-scope.js'

const project = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pikku-scope-'))
  await mkdir(join(dir, 'apps', 'app'), { recursive: true })
  await mkdir(join(dir, 'apps', 'admin'), { recursive: true })
  return dir
}

describe('modeScope', () => {
  test('artifacts and knowledge write only their own folder', async () => {
    const dir = await project()
    assert.deepEqual(modeScope('artifacts', dir), { only: ['artifacts'] })
    assert.deepEqual(modeScope('knowledge', dir), { only: ['knowledge'] })
  })

  test('prototype writes only the prototype beside each app', async () => {
    const dir = await project()
    const scope = modeScope('prototype', dir)
    assert.deepEqual([...scope.only!].sort(), ['apps/admin-prototype', 'apps/app-prototype'])
    assert.equal(existsSync(join(dir, 'apps', 'app-prototype')), true)
  })

  test('prototypes are not given prototypes of their own', async () => {
    const dir = await project()
    modeScope('prototype', dir)
    assert.deepEqual([...modeScope('prototype', dir).only!].sort(), ['apps/admin-prototype', 'apps/app-prototype'])
  })

  test('build locks the prototypes and nothing else', async () => {
    const dir = await project()
    const scope = modeScope('build', dir)
    assert.equal(scope.only, undefined)
    assert.deepEqual(scope.protected!.map((p) => p.replace(dir, '')).sort(), ['/apps/admin-prototype', '/apps/app-prototype'])
  })
})
