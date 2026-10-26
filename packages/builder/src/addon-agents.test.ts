import { strict as assert } from 'node:assert'
import { mkdirSync, mkdtempSync, readFileSync, existsSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { addonAgentPath, linkedAddons, loadAddonAgent, type LinkedAddon } from './agents.js'
import { MODE_PROMPTS, TALK, agentScope, piArgs, projectKey, slotFor, slotKey } from './pi.js'
import { addonSkills, writeSkills } from './skills.js'

const AGENT = '---\ntitle: lib__title\ndescription: lib__description\n---\n\nYou find things.\nFollow the `lib-search` skill.\n'

const addonDir = (extra: Record<string, string> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'addon-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@x/lib', studio: { addon: 'lib' } }))
  mkdirSync(join(dir, 'agents'))
  writeFileSync(join(dir, 'agents', 'librarian.md'), AGENT)
  for (const [path, text] of Object.entries({ 'skills/lib-search/SKILL.md': '---\nname: lib-search\ndescription: d\n---\nSearch.', 'skills/lib-search/reference/notes.md': 'notes', ...extra })) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}
const link = (dir: string): LinkedAddon[] => [{ addon: 'lib', dir }]

describe('agent slots', () => {
  it('maps studio:<name> to the specialist slot and an addon agent to its own', () => {
    assert.equal(slotFor('shop', undefined, 'studio:knowledge'), 'shop:knowledge')
    assert.equal(slotFor('shop', undefined, 'lib:librarian'), 'shop:agent:lib:librarian')
    assert.equal(slotFor('shop', 'emails'), 'shop:emails')
    assert.equal(slotFor('shop'), 'shop')
    assert.equal(slotFor('shop', 'emails', 'lib:librarian'), 'shop:agent:lib:librarian')
  })

  it('strips an agent slot back to its project', () => {
    assert.equal(projectKey(slotKey('shop', agentScope('lib:librarian'))), 'shop')
    assert.equal(projectKey('shop:knowledge'), 'shop')
  })

  it('refuses references that are not plain names', () => {
    for (const bad of ['', 'librarian', 'lib:', ':x', 'lib:../x', 'lib:a/b', '/etc:passwd', 'Lib:x', 'studio:nope', 'lib:x:y', 'lib:1x'])
      assert.throws(() => agentScope(bad), /Not an agent|no agent/, bad)
  })
})

describe('addon agents', () => {
  it('reads agents/<name>.md from the package', () => {
    const agent = loadAddonAgent('lib', 'librarian', link(addonDir()))
    assert.deepEqual(agent, { title: 'lib__title', description: 'lib__description', instructions: 'You find things. Follow the `lib-search` skill.' })
  })

  it('never reads outside the package', () => {
    const dir = addonDir()
    const outside = mkdtempSync(join(tmpdir(), 'outside-'))
    writeFileSync(join(outside, 'secret.md'), AGENT)
    symlinkSync(join(outside, 'secret.md'), join(dir, 'agents', 'leak.md'))
    for (const name of ['../package', '..', '/etc/passwd', 'a/b', 'leak', 'Librarian', ''])
      assert.equal(addonAgentPath('lib', name, link(dir)), null, name)
    assert.equal(addonAgentPath('../lib', 'librarian', link(dir)), null)
    assert.equal(addonAgentPath('other', 'librarian', link(dir)), null)
    assert.throws(() => loadAddonAgent('lib', '../package', link(dir)))
  })

  it('finds linked addons through addons.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'host-'))
    const dir = addonDir()
    mkdirSync(join(root, '.studio-addons'))
    writeFileSync(join(root, '.studio-addons', 'addons.json'), JSON.stringify({ addons: [{ name: '@x/lib', dir }] }))
    assert.deepEqual(linkedAddons(join(root, 'a', 'b')), [{ addon: 'lib', dir }])
  })

  it('builds the prompt of an addon agent like a non-build specialist, and a studio one is unchanged', () => {
    process.env.PIKKU_STUDIO_ADDONS_FILE = join(mkdtempSync(join(tmpdir(), 'host-')), 'addons.json')
    const dir = addonDir()
    writeFileSync(process.env.PIKKU_STUDIO_ADDONS_FILE, JSON.stringify({ addons: [{ name: '@x/lib', dir }] }))
    try {
      const prompt = (scope: Parameters<typeof piArgs>[0]['scope']) => {
        const args = piArgs({ skills: '/s', scope, briefing: 'BRIEF' })
        return args[args.indexOf('--append-system-prompt') + 1]
      }
      assert.equal(prompt(agentScope('lib:librarian')), ['You find things. Follow the `lib-search` skill.', TALK, 'BRIEF'].join('\n\n'))
      assert.equal(prompt(agentScope('studio:knowledge')), [MODE_PROMPTS.knowledge, TALK, 'BRIEF'].join('\n\n'))
      assert.throws(() => prompt(agentScope('lib:missing')))
    } finally {
      delete process.env.PIKKU_STUDIO_ADDONS_FILE
    }
  })
})

describe('addon skills', () => {
  it('copies each addon skill into the skills dir and the hash follows their content', async () => {
    const home = mkdtempSync(join(tmpdir(), 'home-'))
    const dir = addonDir()
    const without = await writeSkills(home, [])
    const first = await writeSkills(home, link(dir))
    assert.notEqual(first, without)
    assert.equal(readFileSync(join(first, 'lib-search', 'SKILL.md'), 'utf8').includes('Search.'), true)
    assert.equal(readFileSync(join(first, 'lib-search', 'reference', 'notes.md'), 'utf8'), 'notes')
    assert.equal(existsSync(join(without, 'lib-search')), false)
    assert.equal(await writeSkills(home, link(dir)), first)
    writeFileSync(join(dir, 'skills/lib-search/SKILL.md'), '---\nname: lib-search\ndescription: d\n---\nSearch better.')
    const second = await writeSkills(home, link(dir))
    assert.notEqual(second, first)
    assert.equal(readFileSync(join(second, 'lib-search', 'SKILL.md'), 'utf8').includes('better'), true)
  })

  it('never overwrites a skill Studio already has, and skips odd names and links', async () => {
    const home = mkdtempSync(join(tmpdir(), 'home-'))
    const core = readdirNames(await writeSkills(home, []))[0]!
    const outside = mkdtempSync(join(tmpdir(), 'outside-'))
    writeFileSync(join(outside, 'SKILL.md'), 'x')
    const dir = addonDir({ [`skills/${core}/SKILL.md`]: 'HIJACK', 'skills/Bad Name/SKILL.md': 'x', 'skills/nodoc/readme.md': 'x' })
    symlinkSync(outside, join(dir, 'skills', 'linked'))
    assert.deepEqual([...addonSkills(link(dir)).keys()].sort(), [core, 'lib-search'].sort())
    const merged = await writeSkills(home, link(dir))
    assert.equal(readFileSync(join(merged, core, 'SKILL.md'), 'utf8').includes('HIJACK'), false)
    assert.equal(existsSync(join(merged, 'linked')), false)
    assert.equal(existsSync(join(merged, 'lib-search', 'SKILL.md')), true)
  })
})

import { readdirSync } from 'node:fs'
const readdirNames = (dir: string) => readdirSync(dir).filter((n) => existsSync(join(dir, n, 'SKILL.md')))
