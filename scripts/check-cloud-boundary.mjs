// Open/OSS boundary: packages/pikkustudio-blocks may not name Pikku Studio Cloud, except in the pitch ("what Pikku Studio Cloud adds").
// Allowed: CloudPitch*.tsx, the name `CloudPitch`, catalog keys prefixed `cloud_pitch__`, the field name `cloudProjectId`, and the
// listed wire constants. Everything else that speaks of Pikku Studio Cloud reaches the open package through slots (lib/slots.ts,
// lib/copy.ts) supplied by packages/blocks-cloud. Run: bun run check:cloud-boundary
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = path.join(root, 'packages/pikkustudio-blocks')
const PITCH_FILE = /(^|\/)CloudPitch[^/]*\.tsx$/
// `CloudPitch` is the pitch component and `cloud_pitch__*` its messages; screens may mount and ask for them.
const ALLOWED_IDENTIFIERS = [/cloudProjectId/g, /\bCloudPitch\b/g, /\bcloud_pitch__\w+/g]
// Wire constants shared with a server; changing them would break existing data. Each needs a reason.
const WIRE = [
  { file: 'src/lib/seal.ts', line: /^const SALT = 'pikkufabric\/sealed-box\/v1'$/, why: 'HKDF salt shared with the unsealing server; changing it makes existing sealed values unreadable' },
  { file: 'src/blocks/ImpersonatePanel.tsx', line: /data\?\.source === 'fabric-preview'/, why: 'postMessage source stamped by the preview script injected into running apps (addon-pikkustudio vite-preview); apps already running would stop answering if it changed' },
  { file: 'src/blocks/ImpersonatePanel.tsx', line: /postMessage\(\{ source: 'fabric-console'/, why: 'postMessage source the injected preview script and apps/app check on every incoming message' },
  { file: 'src/lib/updates-feed.ts', line: /event\.subject === 'fabric'/, why: 'subject the studio audit records for ai.choose when the hosted AI is picked; stored rows already carry it' },
  { file: 'src/lib/updates-feed.test.ts', line: /subject: 'fabric'/, why: 'same stored ai.choose subject, as a fixture' },
]

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))

const hits = []
const scan = (rel, text) => {
  text.split('\n').forEach((raw, i) => {
    let line = raw
    for (const re of ALLOWED_IDENTIFIERS) line = line.replace(re, '')
    if (!/fabric|pikku studio cloud/i.test(line)) return
    if (WIRE.some((w) => w.file === rel && w.line.test(raw.trim()))) return
    hits.push(`${rel}:${i + 1}: ${raw.trim().slice(0, 140)}`)
  })
}

for (const file of walk(path.join(pkg, 'src'))) {
  const rel = path.relative(pkg, file).split(path.sep).join('/')
  if (PITCH_FILE.test(file.split(path.sep).join('/')) || !/\.(tsx?|css|json)$/.test(file)) continue
  scan(rel, fs.readFileSync(file, 'utf8'))
}

const catalog = JSON.parse(fs.readFileSync(path.join(pkg, 'messages/en.json'), 'utf8'))
for (const [key, value] of Object.entries(catalog)) {
  if (key.startsWith('cloud_pitch__')) continue
  if (/fabric|pikku studio cloud/i.test(key + String(value))) hits.push(`messages/en.json: ${key}: ${String(value).slice(0, 100)}`)
}

if (hits.length) {
  console.error(`Pikku Studio Cloud is named ${hits.length} time(s) in the open package outside the pitch:\n${hits.join('\n')}`)
  process.exit(1)
}
console.log('check-cloud-boundary: 0 hits')
