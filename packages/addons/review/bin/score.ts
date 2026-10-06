import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { diffMeta, rank } from '../src/lib/score.ts'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : (args[i + 1] ?? fallback)
}

const projectDir = resolve(args.find((a) => !a.startsWith('--')) ?? process.cwd())
const top = Number(flag('top', '50'))
const asJson = args.includes('--json')

const candidatePaths = [
  join(projectDir, '.pikku/function/pikku-functions-meta-verbose.gen.json'),
  join(projectDir, 'packages/api-functions/.pikku/function/pikku-functions-meta-verbose.gen.json'),
]

const metaPath = candidatePaths.find(existsSync)
if (!metaPath) {
  console.error(`No verbose functions meta found under ${projectDir}`)
  console.error('Looked for:')
  for (const p of candidatePaths) console.error(`  ${p}`)
  process.exit(1)
}

const meta = JSON.parse(readFileSync(metaPath, 'utf8'))

const sincePath = flag('since', '')
const since = sincePath ? JSON.parse(readFileSync(resolve(sincePath), 'utf8')) : undefined
const signalsPath = flag('signals', '')
const signals = signalsPath ? JSON.parse(readFileSync(resolve(signalsPath), 'utf8')) : undefined
const ranked = rank(meta, {
  ...(since ? { changedSince: since } : {}),
  ...(signals ? { signals } : {}),
})

if (asJson) {
  console.log(JSON.stringify(ranked.slice(0, top), null, 2))
  process.exit(0)
}

const total = Object.keys(meta).length
console.log(`meta      ${metaPath.replace(projectDir + '/', '')}`)
if (since) {
  const d = diffMeta(meta, since)
  console.log(`since     ${sincePath}`)
  console.log(
    `changed   ${d.added.size} added  ${d.contract.size} contract  ${d.implementation.size} body  ${d.removed.length} removed`,
  )
}
console.log(`functions ${total}  reviewable clusters ${ranked.length}`)
console.log('')

for (const [i, c] of ranked.slice(0, top).entries()) {
  const rankNo = String(i + 1).padStart(3)
  const score = String(c.score).padStart(4)
  const cluster = c.clusterSize > 1 ? ` ×${c.clusterSize}` : ''
  const tag = c.change ? `  [${c.change}]` : ''
  console.log(`${rankNo}. ${score}  ${c.name}${cluster}${tag}`)
  console.log(`          ${c.sourceFile}:${c.bodyStart}-${c.bodyEnd}`)
  console.log(
    `          ${c.components.map((p) => `${p.label} ${p.points > 0 ? '+' : ''}${p.points}`).join('  ')}`,
  )
}

const floor = ranked.slice(-5).reverse()
console.log('')
console.log('bottom of the queue')
for (const c of floor) {
  console.log(`     ${String(c.score).padStart(4)}  ${c.name}  [${c.services.join(', ')}]`)
}
