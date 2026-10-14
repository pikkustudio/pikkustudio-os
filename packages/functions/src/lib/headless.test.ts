import { describe, expect, test } from 'bun:test'
import { tickChanges } from './headless.js'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('tickChanges', () => {
  test('asks the builder for new work only while the project is running, one call at a time', async () => {
    let running = false
    let calls = 0
    let inFlight = 0
    let overlapped = false
    const studio = {
      projects: { runningProject: () => (running ? { port: 1 } : null) },
      builder: {
        startChanges: async (key: string, onlyNew: boolean) => {
          expect([key, onlyNew]).toEqual(['app', true])
          calls += 1
          inFlight += 1
          overlapped ||= inFlight > 1
          await wait(25)
          inFlight -= 1
          return { started: false, reason: 'Nothing to do' }
        },
      },
    } as any
    const stop = tickChanges(studio, 'app', 5)
    await wait(40)
    expect(calls).toBe(0)
    running = true
    await wait(80)
    stop()
    const seen = calls
    await wait(40)
    expect(seen).toBeGreaterThan(0)
    expect(calls).toBe(seen)
    expect(overlapped).toBe(false)
  })
})
