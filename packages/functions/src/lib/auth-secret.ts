import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function studioAuthSecret(home: string): string {
  const file = join(home, 'auth-secret')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  const secret = randomBytes(32).toString('base64url')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, secret, { mode: 0o600 })
  return secret
}
