// The open repo builds alone: nothing under apps/ or packages/ (the private addon folders are not tracked here) may
// name a private package. Run: bun run check:independence
import { execFileSync } from 'node:child_process'

const FORBIDDEN = [
  '@pikkustudio/blocks-licensed',
  '@pikkustudio/blocks-cloud',
  '@project/app',
  '@pikku/shadcdn',
  'pikkustudio-cloud',
  // The private addons are wired only by scripts/link-addon.mjs and the generated files it feeds; source never names them.
  '@pikkustudio/addon-cloud',
  '@pikkustudio/addon-controlpanel',
]

const hits = []
for (const needle of FORBIDDEN) {
  let out = ''
  try {
    out = execFileSync(
      'git',
      ['grep', '-n', '-F', needle, '--', 'apps', 'packages', 'package.json', ':!*.md', ':!*/LICENSE', ':!apps/studio/wrangler.hosted.jsonc'],
      { encoding: 'utf8' }
    )
  } catch {}
  for (const line of out.split('\n').filter(Boolean)) hits.push(`${needle}: ${line}`)
}

for (const h of hits) console.log(h)
console.log(`check-independence: ${hits.length} hits`)
process.exit(hits.length ? 1 : 0)
