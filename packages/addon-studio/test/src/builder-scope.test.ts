import assert from 'node:assert'
import { describe, test } from 'node:test'
import { modeScope } from '../../src/services/builder-scope.js'

describe('modeScope', () => {
  test('artifacts, knowledge and emails write only their own folder', () => {
    assert.deepEqual(modeScope('artifacts'), { only: ['artifacts'] })
    assert.deepEqual(modeScope('knowledge'), { only: ['knowledge'] })
    assert.deepEqual(modeScope('emails'), { only: ['emails'] })
    assert.deepEqual(modeScope('project'), { only: ['knowledge'] })
  })

  test('frontend writes only the frontends, mocks, flags, generated files, theme and the emails theme file', () => {
    assert.deepEqual(modeScope('frontend'), { only: ['apps', '.mocks', 'DESIGN.md', '.pikku', 'packages/functions-sdk', 'packages/theme', 'packages/functions/src/flags.ts', 'packages/functions/.pikku', 'emails/theme.json'] })
  })

  test('build has no extra limits', () => {
    assert.deepEqual(modeScope('build'), {})
  })
})

test('an agent an addon ships may only write notes in knowledge/', () => {
  assert.deepEqual(modeScope('agent:spindle:librarian'), { only: ['knowledge'] })
})
