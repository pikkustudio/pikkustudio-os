import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { startVault } from './server.js'

const home = process.env.PIKKU_VAULT_HOME ?? join(homedir(), '.pikkustudio')
mkdirSync(home, { recursive: true })

const vault = await startVault(home)
if (!vault) process.exit(0)

const stop = async () => {
  await vault.close()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
