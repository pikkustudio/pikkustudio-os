import assert from 'node:assert'
import { describe, test } from 'node:test'
import { allowed, classifyActivity, deriveChecklist, guideContext, latestActivity, type Signals } from '../../src/lib/project-checklist.js'
import type { Intake } from '../../src/services/projects.js'

const intake = (patch: Partial<Intake> = {}): Intake => ({ path: 'interview', done: false, idea: 'a booking app', surfaces: [], devices: [], answers: [], skipped: [], run: null, jobs: {}, samples: false, ...patch })
const answered = (n: number) => Array.from({ length: n }, (_, i) => ({ question: `q${i + 1}`, answer: `a${i + 1}`, skipped: false }))

const signals = (patch: Partial<Signals> = {}): Signals => ({
  intake: intake(),
  directions: { total: 0, chosen: false },
  designed: false,
  samples: 0,
  busy: { frontend: false, build: false },
  publish: { state: 'idle', url: null },
  run: null,
  activity: null,
  now: 1_000_000,
  ...patch,
})

const by = (s: Signals) => Object.fromEntries(deriveChecklist(s).steps.map((x) => [x.id, x]))

describe('the six steps', () => {
  test('a fresh interview project waits on the questions and nothing else has started', () => {
    const steps = by(signals())
    assert.equal(steps.questions.state, 'needs-you')
    assert.equal(steps.questions.count, 0)
    assert.deepEqual(['explore', 'frontend', 'backend', 'tests', 'publish'].map((id) => steps[id].state), Array(5).fill('not-started'))
    assert.equal(deriveChecklist(signals()).steps.length, 6)
  })

  test('the questions finish after exactly five answers, skipped ones included', () => {
    const steps = by(signals({ intake: intake({ answers: [...answered(4), { question: 'q5', answer: '', skipped: true }], done: true }) }))
    assert.equal(steps.questions.state, 'done')
    assert.equal(steps.questions.count, 5)
    assert.deepEqual(steps.questions.actions, ['reopen'])
  })

  test('the design-first path marks the questions skipped and lets exploring begin', () => {
    const steps = by(signals({ intake: intake({ path: 'design', skipped: ['questions'] }), run: { status: 'running', step: 'Start it' } }))
    assert.equal(steps.questions.state, 'skipped')
    assert.deepEqual(steps.questions.actions, ['undo'])
    assert.equal(steps.explore.state, 'working')
    assert.equal(steps.explore.step, 'Start it')
  })

  test('exploring shows how many directions are ready, then asks for a pick, then is done once one is chosen', () => {
    const base = intake({ answers: answered(5), done: true, run: { id: 'r', at: 5 } })
    const running = by(signals({ intake: base, run: { status: 'running' }, directions: { total: 2, chosen: false } }))
    assert.equal(running.explore.state, 'working')
    assert.equal(running.explore.count, 2)
    assert.equal(running.explore.since, 5)
    const pick = by(signals({ intake: base, run: { status: 'completed' }, directions: { total: 4, chosen: false } }))
    assert.equal(pick.explore.state, 'needs-you')
    assert.equal(pick.explore.detail, 'pick')
    const chosen = by(signals({ intake: base, directions: { total: 4, chosen: true }, busy: { frontend: true, build: false } }))
    assert.equal(chosen.explore.state, 'done')
    assert.equal(chosen.frontend.state, 'working')
    assert.deepEqual(chosen.frontend.typical, { min: 10, max: 14 })
  })

  test('a failed run says so and offers a retry', () => {
    const steps = by(signals({ intake: intake({ answers: answered(5), done: true }), run: { status: 'failed', error: 'no key' } }))
    assert.equal(steps.explore.state, 'needs-you')
    assert.equal(steps.explore.error, 'no key')
    assert.deepEqual(steps.explore.actions, ['retry'])
  })

  test('the handoff to the design agent starts when the frontend is under way', () => {
    const base = signals({ intake: intake({ answers: answered(5), done: true }), directions: { total: 4, chosen: true } })
    assert.equal(deriveChecklist(base).handoff, false)
    assert.equal(deriveChecklist({ ...base, busy: { frontend: true, build: false } }).handoff, true)
    assert.equal(deriveChecklist({ ...base, designed: true }).handoff, true)
  })

  const built = (patch: Omit<Partial<Signals>, 'intake'> & { intake?: Partial<Intake> } = {}) => {
    const { intake: i, ...rest } = patch
    return signals({ intake: intake({ answers: answered(5), done: true, ...i }), directions: { total: 4, chosen: true }, designed: true, samples: 3, ...rest })
  }

  test('after the frontend the backend is offered, with skip and start', () => {
    const steps = by(built())
    assert.equal(steps.frontend.state, 'done')
    assert.equal(steps.backend.state, 'needs-you')
    assert.equal(steps.backend.count, 3)
    assert.deepEqual(steps.backend.actions, ['start', 'skip'])
    assert.equal(steps.tests.state, 'not-started')
    assert.equal(steps.publish.state, 'not-started')
    assert.deepEqual(steps.publish.actions, ['fast-track'])
  })

  test('skipped steps show as skipped with an undo, and unlock the next one', () => {
    const steps = by(built({ intake: { skipped: ['backend', 'tests'] } }))
    assert.equal(steps.backend.state, 'skipped')
    assert.equal(steps.backend.mock, true)
    assert.deepEqual(steps.backend.actions, ['undo'])
    assert.equal(steps.tests.state, 'skipped')
    assert.equal(steps.publish.state, 'needs-you')
    assert.equal(steps.publish.detail, 'ready-samples')
  })

  test('publishing with samples leaves the backend open and marked as sample', () => {
    const steps = by(built({ intake: { samples: true, skipped: ['tests'] } }))
    assert.equal(steps.backend.state, 'needs-you')
    assert.equal(steps.backend.detail, 'still-sample')
    assert.equal(steps.backend.mock, true)
    assert.equal(steps.publish.state, 'needs-you')
    assert.equal(steps.publish.mock, true)
    const live = deriveChecklist(built({ intake: { samples: true, skipped: ['tests'] }, publish: { state: 'done', url: 'https://x' } }))
    assert.equal(live.steps[5].state, 'done')
    assert.equal(live.steps[5].detail, 'live-samples')
    assert.equal(live.withSamples, true)
  })

  test('a running build job is the working step and finished jobs are done', () => {
    const working = by(built({ intake: { jobs: { backend: 10 } }, busy: { frontend: false, build: true } }))
    assert.equal(working.backend.state, 'working')
    assert.equal(working.backend.since, 10)
    const done = by(built({ intake: { jobs: { backend: 10, tests: 20 } } }))
    assert.equal(done.backend.state, 'done')
    assert.equal(done.tests.state, 'done')
    assert.equal(done.publish.detail, 'ready')
  })

  test('nothing sample left means the backend is already done', () => {
    assert.equal(by(built({ samples: 0 })).backend.state, 'done')
  })

  test('an action is only allowed when the step lists it', () => {
    const list = deriveChecklist(built())
    assert.equal(allowed(list, 'tests', 'skip'), false)
    assert.equal(allowed(list, 'backend', 'skip'), true)
  })

  test('the guide context states which question is next and forbids asking after the fifth', () => {
    const open = guideContext(deriveChecklist(signals({ intake: intake({ answers: answered(2) }) })), 0)
    assert.match(open, /question 3 of 5/)
    const closed = guideContext(deriveChecklist(signals({ intake: intake({ answers: answered(5), done: true }) })), 0)
    assert.match(closed, /Never ask a question card/)
  })
})

describe('activity lines', () => {
  test('files become one plain subject each', () => {
    assert.deepEqual(classifyActivity('src/functions/bookings.function.ts'), { kind: 'function', name: 'bookings' })
    assert.deepEqual(classifyActivity('src/migrations/0003_create_classes.sql'), { kind: 'table', name: 'classes' })
    assert.deepEqual(classifyActivity('apps/app/src/routes/app.class-schedule.tsx'), { kind: 'screen', name: 'class schedule' })
    assert.deepEqual(classifyActivity('.mocks/classes.month/healthy.json'), { kind: 'mock', name: 'classes' })
    assert.equal(classifyActivity('src/permissions/staff.permissions.ts')?.kind, 'permissions')
    assert.equal(classifyActivity('test/scenarios/booking.scenario.ts')?.kind, 'test')
    assert.equal(classifyActivity('guide/studio/bookings.md')?.kind, 'docs')
    assert.equal(classifyActivity('pikku all')?.kind, 'check')
    assert.equal(classifyActivity(''), null)
  })

  test('the latest classified tool call wins and knowledge notes are ignored', () => {
    const found = latestActivity([
      { summary: 'src/functions/bookings.function.ts', at: 1 },
      { summary: 'knowledge/index.md', at: 2 },
      { summary: 'README', at: 3 },
    ])
    assert.deepEqual(found, { kind: 'function', name: 'bookings', at: 1 })
  })
})
