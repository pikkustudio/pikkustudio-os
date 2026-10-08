import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chosenDirection, frontendBriefing } from './briefing.js'

const project = () => {
  const dir = mkdtempSync(join(tmpdir(), 'briefing-'))
  mkdirSync(join(dir, 'artifacts/direction-2'), { recursive: true })
  writeFileSync(join(dir, 'artifacts/direction-2/artifact.json'), '{"chosen": true}')
  writeFileSync(join(dir, 'artifacts/direction-2/index.html'), '<h1>Bakery</h1>')
  mkdirSync(join(dir, 'apps/app/src/pages'), { recursive: true })
  writeFileSync(join(dir, 'apps/app/src/pages/HomePage.tsx'), 'export const HomePage = () => null')
  mkdirSync(join(dir, '.mocks/reminders.list'), { recursive: true })
  return dir
}

test('names the chosen direction and carries its files', async () => {
  const dir = project()
  expect(chosenDirection(dir)).toBe('direction-2')
  const text = await frontendBriefing(dir)
  expect(text).toContain('artifacts/direction-2')
  expect(text).toContain('<h1>Bakery</h1>')
  expect(text).toContain('apps/app/src/pages/HomePage.tsx')
  expect(text).toContain('Existing mocks: reminders.list')
})

test('prefers the design language over the page html', async () => {
  const dir = project()
  writeFileSync(join(dir, 'artifacts/direction-2/DESIGN.md'), '---\nname: Bakery\n---\n## Overview')
  const text = await frontendBriefing(dir)
  expect(text).toContain('The design language of this app')
  expect(text).toContain('## Overview')
  expect(text).not.toContain('<h1>Bakery</h1>')
  expect(text).toContain('artifacts/direction-2/index.html')
})

test('a root DESIGN.md wins over the direction one', async () => {
  const dir = project()
  writeFileSync(join(dir, 'artifacts/direction-2/DESIGN.md'), 'from direction')
  writeFileSync(join(dir, 'DESIGN.md'), 'from root')
  const text = await frontendBriefing(dir)
  expect(text).toContain('from root')
  expect(text).not.toContain('from direction')
})

test('tells the agent to leave stories for later', async () => {
  expect(await frontendBriefing(project())).toContain('Do not edit *.stories.tsx')
})

test('an empty project still yields the rules', async () => {
  expect(await frontendBriefing(mkdtempSync(join(tmpdir(), 'briefing-')))).toContain('Rules that save turns')
})
