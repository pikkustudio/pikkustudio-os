import { spawn } from 'node:child_process'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'

export const RestartDevInput = z.object({})

export const RestartDevOutput = z.object({ restarted: z.boolean(), reason: z.string() })

const run = (command: string) =>
  new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn('sh', ['-c', command], { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => (output = (output + chunk).slice(-2000)))
    child.stderr.on('data', (chunk) => (output = (output + chunk).slice(-2000)))
    child.once('error', (error) => resolve({ code: 1, output: error.message }))
    child.once('close', (code) => resolve({ code: code ?? 1, output }))
  })

export const restartDev = pikkuSessionlessFunc({
  description: "Restart the project's dev server so it picks up changed variables and secrets.",
  input: RestartDevInput,
  output: RestartDevOutput,
  func: async () => {
    const command = process.env.PIKKU_STUDIO_RESTART_DEV
    if (!command) return { restarted: false, reason: 'This Studio has no dev server to restart' }
    const { code, output } = await run(command)
    return code === 0 ? { restarted: true, reason: 'Restarted' } : { restarted: false, reason: output.trim().split('\n').slice(-3).join('\n') || `Restart exited ${code}` }
  },
})
