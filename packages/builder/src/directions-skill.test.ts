import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { DIRECTIONS_REFERENCES, writeDirectionsSkill } from './directions-skill.js'
import { EXPLORE_PROMPT, piArgs } from './pi.js'

describe('direction role skill', () => {
  test('the explore role loads the directions skill, not impeccable', async () => {
    const impeccable = await mkdtemp(join(tmpdir(), 'imp-'))
    await mkdir(join(impeccable, 'reference'))
    await writeFile(join(impeccable, 'SKILL.md'), '---\nname: impeccable\n---\n')
    await writeFile(join(impeccable, 'reference', DIRECTIONS_REFERENCES[0]), 'floor')
    process.env.PIKKU_IMPECCABLE_SKILL = impeccable
    const home = await mkdtemp(join(tmpdir(), 'home-'))
    process.env.PIKKU_BUILDER_HOME = home
    const args = piArgs({ skills: '/skills', role: 'explore' })
    const skill = args[args.indexOf('--skill') + 1]
    assert.notStrictEqual(skill, impeccable)
    assert.ok(skill.startsWith(join(home, 'skills', 'directions-')))
    const text = readFileSync(join(skill, 'SKILL.md'), 'utf8')
    assert.ok(!text.includes('build-phase'))
    assert.ok(text.includes('artifact.json'))
    assert.ok(existsSync(join(skill, 'reference', DIRECTIONS_REFERENCES[0])))
    assert.strictEqual(writeDirectionsSkill(impeccable, home), skill)
    assert.ok(EXPLORE_PROMPT.includes('Do not take screenshots'))
  })
})
