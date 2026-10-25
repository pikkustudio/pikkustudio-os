import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { loadAgent, parseAgent } from './agents.js'
import { MODE_PROMPTS, SPECIALISTS, piArgs, systemPrompt } from './pi.js'

// prompts.json was captured from the prompts as they were written in pi.ts, before they moved into agents/*.md
const before: Record<string, string> = JSON.parse(readFileSync(new URL('./fixtures/prompts.json', import.meta.url), 'utf8'))
const messages: Record<string, string> = JSON.parse(readFileSync(new URL('../../ui-blocks/messages/en.json', import.meta.url), 'utf8'))

const argPrompt = (scope: (typeof SPECIALISTS)[number]) => {
  const args = piArgs({ skills: '/s', scope, briefing: 'BRIEF' })
  return args[args.indexOf('--append-system-prompt') + 1]
}

describe('agent files', () => {
  it('builds every specialist prompt byte-identical to before', () => {
    assert.equal(systemPrompt(), before.build)
    for (const name of ['frontend', 'artifacts', 'knowledge', 'emails', 'project'] as const) assert.equal(MODE_PROMPTS[name], before[name], name)
    for (const name of SPECIALISTS) assert.equal(argPrompt(name), before[`arg:${name}`], name)
  })

  it('has a file with message-key title and description for each specialist', () => {
    for (const name of SPECIALISTS) {
      const agent = loadAgent(name)
      assert.ok(messages[agent.title], `${name} title ${agent.title}`)
      assert.ok(messages[agent.description], `${name} description ${agent.description}`)
      assert.ok(agent.instructions.length > 50)
    }
  })

  it('parses frontmatter and joins paragraphs', () => {
    assert.deepEqual(parseAgent('---\ntitle: a__t\ndescription: a__d\n---\n\nOne.\nTwo.\n'), { title: 'a__t', description: 'a__d', instructions: 'One. Two.' })
    assert.throws(() => parseAgent('no frontmatter'))
  })
})
