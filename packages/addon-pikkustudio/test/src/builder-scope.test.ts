import assert from 'node:assert'
import { describe, test } from 'node:test'
import { modeScope } from '../../src/services/builder-scope.js'

describe('modeScope', () => {
  test('artifacts, knowledge and emails write only their own folder', () => {
    assert.deepEqual(modeScope('artifacts'), { only: ['artifacts'] })
    assert.deepEqual(modeScope('knowledge'), { only: ['knowledge'] })
    assert.deepEqual(modeScope('emails'), { only: ['emails'] })
  })

  test('build has no extra limits', () => {
    assert.deepEqual(modeScope('build'), {})
  })
})
