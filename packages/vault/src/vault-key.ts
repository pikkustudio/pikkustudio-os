import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { generateSealingKeypair, type SealingKeypair } from './sealed-box.js'

export const vaultKeypair = (home: string): SealingKeypair => {
  const file = join(home, 'vault-key.json')
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as SealingKeypair
  const keypair = generateSealingKeypair()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(keypair), { mode: 0o600 })
  chmodSync(file, 0o600)
  return keypair
}
