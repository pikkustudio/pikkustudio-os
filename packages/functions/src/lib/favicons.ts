import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, isAbsolute, join } from 'node:path'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

const FAVICON_PNG = 'favicon-196.png'
const APPLE_ICON_PNG = 'apple-icon-180.png'

const ICONS = [
  { size: 196, filename: FAVICON_PNG },
  { size: 180, filename: APPLE_ICON_PNG },
  { size: 192, filename: 'manifest-icon-192.png' },
  { size: 512, filename: 'manifest-icon-512.png' },
]

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

let ready: Promise<void> | undefined

const wasmFile = () =>
  process.env.PIKKU_STUDIO_RUNTIME_DIR
    ? join(process.env.PIKKU_STUDIO_RUNTIME_DIR, 'resvg', 'index_bg.wasm')
    : createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm')

const init = () => (ready ??= (async () => initWasm(await Bun.file(wasmFile()).arrayBuffer()))())

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export async function renderIcon(
  logo: Buffer,
  mime: string,
  size: number,
  background: string,
  padding: number,
): Promise<Uint8Array> {
  await init()
  const inset = Math.round(size * padding)
  const inner = size - inset * 2
  const uri = `data:${mime};base64,${logo.toString('base64')}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${escapeAttr(background)}"/><image href="${uri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/></svg>`
  return new Resvg(svg).render().asPng()
}

export function pngToIco(png: Uint8Array, size: number): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0)
  entry.writeUInt8(size >= 256 ? 0 : size, 1)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, png])
}

export async function frontendDir(projectDir: string, app?: string): Promise<string> {
  const config = JSON.parse(await readFile(join(projectDir, 'pikku.config.json'), 'utf8')) as {
    frontends?: Record<string, { cwd: string; primary?: boolean }>
  }
  const entries = Object.entries(config.frontends ?? {})
  if (entries.length === 0) return projectDir
  const picked = app
    ? entries.find(([slug]) => slug === app)
    : (entries.find(([, f]) => f.primary) ?? entries[0])
  if (!picked) throw new Error(`No frontend "${app}". Available: ${entries.map(([s]) => s).join(', ')}`)
  return join(projectDir, picked[1].cwd)
}

export function resolveLogo(projectDir: string, appDir: string, source: string): string | null {
  const candidates = isAbsolute(source)
    ? [source]
    : [join(appDir, source), join(appDir, 'public', source), join(projectDir, source)]
  return candidates.find((c) => existsSync(c)) ?? null
}

export async function writeFavicons(opts: {
  logoPath: string
  appDir: string
  background: string
}): Promise<{ generated: string[]; tagsAdded: string[]; indexNote: string }> {
  const mime = MIME[extname(opts.logoPath).toLowerCase()]
  if (!mime) throw new Error('The logo must be an SVG, PNG, JPEG, WebP or GIF')
  const logo = Buffer.from(await readFile(opts.logoPath))
  const publicDir = join(opts.appDir, 'public')
  await mkdir(publicDir, { recursive: true })

  const generated: string[] = []
  let faviconPng: Uint8Array | undefined
  for (const { size, filename } of ICONS) {
    const png = await renderIcon(logo, mime, size, opts.background, 0.1)
    await writeFile(join(publicDir, filename), png)
    generated.push(filename)
    if (filename === FAVICON_PNG) faviconPng = png
  }
  await writeFile(join(publicDir, 'favicon.ico'), pngToIco(faviconPng!, 196))
  generated.push('favicon.ico')

  const tags = [
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
    `<link rel="icon" type="image/png" sizes="196x196" href="/${FAVICON_PNG}">`,
    `<link rel="apple-touch-icon" href="/${APPLE_ICON_PNG}">`,
  ]
  const indexPath = join(opts.appDir, 'index.html')
  if (!existsSync(indexPath)) {
    return {
      generated,
      tagsAdded: [],
      indexNote: 'No index.html in the app root, so the icons were written but not linked.',
    }
  }
  let html = await readFile(indexPath, 'utf8')
  const missing = tags.filter((t) => !html.includes(/href="([^"]+)"/.exec(t)![1]!))
  if (missing.length === 0) return { generated, tagsAdded: [], indexNote: 'index.html already links the icons.' }
  if (!/<\/head>/i.test(html)) {
    return { generated, tagsAdded: [], indexNote: 'index.html has no </head>, so the icons were not linked.' }
  }
  html = html.replace(/<\/head>/i, `${missing.map((t) => `    ${t}`).join('\n')}\n  </head>`)
  await writeFile(indexPath, html)
  return { generated, tagsAdded: missing, indexNote: `Linked ${missing.length} icon tag(s) in index.html.` }
}
