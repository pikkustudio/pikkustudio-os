import { spawn } from 'node:child_process'

export type BoundedResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean; error?: string }

const CAP = 1024 * 1024

/**
 * Runs a command in its own process group and, on timeout, kills the whole group. `execFile`'s timeout
 * only kills the direct child, so a tool that forked a helper (worktrunk, a package manager) would leave
 * the helper running. Never throws: a command that cannot start comes back with `error` set.
 */
export function runBounded(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs: number }
): Promise<BoundedResult> {
  return new Promise((done) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    const finish = (result: BoundedResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      done(result)
    }
    const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL')
      } catch {
        child.kill('SIGKILL')
      }
    }
    const timer = setTimeout(() => {
      timedOut = true
      killGroup()
      // Do not wait for pipes a surviving process might hold open.
      setTimeout(() => finish({ code: null, stdout, stderr, timedOut: true }), 1000).unref()
    }, options.timeoutMs)
    child.stdout.on('data', (chunk) => {
      if (stdout.length < CAP) stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      if (stderr.length < CAP) stderr += chunk
    })
    child.on('error', (error) => finish({ code: null, stdout, stderr, timedOut, error: error.message }))
    child.on('close', (code) => finish({ code, stdout, stderr, timedOut }))
  })
}

/** The first lines of a tool's stderr that say something: no blanks, no colour codes. */
export const firstLines = (text: string, count = 2): string =>
  text
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(' | ')
    .slice(0, 400)
