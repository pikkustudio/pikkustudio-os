import assert from 'node:assert'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, test } from 'node:test'
import { previewViteConfig, viteModuleUrl } from '../../src/services/vite-preview.js'

describe('previewViteConfig', () => {
  test('imports vite and babel from the app, wherever the config file is written', async () => {
    const root = realpathSync(await mkdtemp(join(tmpdir(), 'pikku-vite-preview-')))
    const app = join(root, 'apps', 'web')
    await mkdir(join(app, 'node_modules', 'vite'), { recursive: true })
    await writeFile(join(app, 'node_modules', 'vite', 'package.json'), JSON.stringify({ exports: { '.': { import: { default: './dist/node/index.js' } } } }))
    const url = pathToFileURL(join(app, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href
    assert.equal(viteModuleUrl(app), url)
    assert.equal(viteModuleUrl(join(app, 'src')), url)
    const config = previewViteConfig(app)
    assert.ok(config.includes(`const VITE = ${JSON.stringify(url)}`))
    assert.ok(config.includes(`createRequire(cwd + '/package.json')`))
    assert.ok(!config.includes(`from 'vite'`))
  })
})
