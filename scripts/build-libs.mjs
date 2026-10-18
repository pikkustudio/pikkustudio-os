import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

const libs = [
  'packages/builder',
  'packages/supervisor',
  'packages/addons/diffui',
  'packages/addons/spindle',
  'packages/addons/review',
  'packages/addons/inbox',
  'packages/addon-pikkustudio',
]

for (const dir of libs) {
  const pkgPath = join(root, dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const { scripts = {} } = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (!scripts.build) continue
  console.log(`build-libs: ${dir}`)
  execSync('bun run build', { cwd: join(root, dir), stdio: 'inherit' })
}
