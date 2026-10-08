import { execFile } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const cap = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n... (cut)` : text)

const read = async (cwd: string, path: string, max: number) => {
  const file = join(cwd, path)
  if (!existsSync(file)) return ''
  return `### ${path}\n\`\`\`\n${cap(await readFile(file, 'utf8'), max)}\n\`\`\`\n`
}

const tree = (root: string, base = '', depth = 2): string[] => {
  if (!existsSync(root)) return []
  return readdirSync(root)
    .filter((name) => !name.startsWith('.') && name !== 'node_modules' && name !== 'paraglide' && !name.endsWith('.gen.ts'))
    .flatMap((name) => {
      const path = join(root, name)
      const rel = base ? `${base}/${name}` : name
      return statSync(path).isDirectory() ? (depth > 1 ? [`${rel}/`, ...tree(path, rel, depth - 1)] : [`${rel}/`]) : [rel]
    })
}

const themes = (cwd: string) =>
  new Promise<string>((resolve) => {
    execFile(existsSync(join(cwd, 'node_modules/.bin/pikku')) ? join(cwd, 'node_modules/.bin/pikku') : 'pikku', ['theme', 'list', '--json'], { cwd, timeout: 15_000, env: process.env }, (error, stdout) => {
      if (error) return resolve('')
      try {
        const data = JSON.parse(stdout.slice(stdout.indexOf('{')))
        const presets = (data.presets ?? []).map((p: { preset: string; description?: string }) => `- ${p.preset}: ${p.description ?? ''}`)
        resolve(presets.length ? `Theme presets (from \`pikku theme list\`, do not run it again):\n${presets.join('\n')}\n` : '')
      } catch {
        resolve('')
      }
    })
  })

const design = async (cwd: string) => {
  const language = await read(cwd, 'DESIGN.md', 4000)
  return language ? `The design language of this app (follow it on every screen):\n${language}` : ''
}

export async function frontendBriefing(cwd: string): Promise<string> {
  const parts = [
    'PROJECT BRIEFING (already gathered for you, so do not spend turns listing or reading these; read a file again only to edit it):',
    await design(cwd),
    `Files under apps/app/src:\n${tree(join(cwd, 'apps/app/src')).join('\n')}\n`,
    await read(cwd, 'apps/app/src/routes/index.tsx', 2000),
    await read(cwd, 'apps/app/src/routes/app.index.tsx', 2000),
    await read(cwd, 'apps/app/src/pages/HomePage.tsx', 2000),
    await read(cwd, 'apps/app/src/components/AppShell.tsx', 3000),
    await read(cwd, 'apps/app/src/styles/domain.css', 2000),
    await read(cwd, 'apps/app/messages/en.json', 2500),
    `Existing mocks: ${existsSync(join(cwd, '.mocks')) ? readdirSync(join(cwd, '.mocks')).join(', ') : 'none'}.\n`,
    await themes(cwd),
    [
      'Rules that save turns:',
      '- Apply the theme once with `pikku theme apply --preset <name> --primary "#hex" --secondary "#hex" --accent "#hex"`. If it ends with an error about emails/theme.json, ignore it: the app theme is already applied and emails/ is not yours.',
      '- Do not edit *.stories.tsx files and do not fix Storybook; stories are done in a later step. Run `bun run lint` once, at the end, and ignore findings in stories files.',
      '- Components own their colour and spacing: add a variant to the ui component rather than passing colour or spacing classes from a page.',
    ].join('\n'),
  ]
  return parts.filter(Boolean).join('\n')
}
