import { execFileSync } from 'node:child_process'

const FORBIDDEN = [
  '@pikkustudio/blocks-licensed',
  '@pikkustudio/blocks-cloud',
  '@project/app',
  '@pikku/shadcdn',
  'pikkustudio-cloud',
]

const hits = []
for (const needle of FORBIDDEN) {
  let out = ''
  try {
    out = execFileSync(
      'git',
      ['grep', '-n', '-F', needle, '--', 'apps', 'packages', 'package.json', ':!*.md', ':!*/LICENSE'],
      { encoding: 'utf8' }
    )
  } catch {}
  for (const line of out.split('\n').filter(Boolean)) hits.push(`${needle}: ${line}`)
}

for (const h of hits) console.log(h)
console.log(`check-independence: ${hits.length} hits`)
process.exit(hits.length ? 1 : 0)
