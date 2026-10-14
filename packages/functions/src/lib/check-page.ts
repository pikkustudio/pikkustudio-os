import puppeteer from 'puppeteer-core'
import type { ToolResolver } from './tools/resolver.js'
import { missingLibs } from './tools/libs.js'

const CHROMIUM_LIBS_APT =
  'sudo apt-get install -y libglib2.0-0t64 libnss3 libnspr4 libatk1.0-0t64 libatspi2.0-0t64 libdbus-1-3 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxcb1 libxkbcommon0 libgbm1 libexpat1 libasound2t64'

export async function checkPage(tools: ToolResolver, running: { port: number; token: string }, path: string) {
  const chromium = await tools.resolve({ tool: 'chromium', requestedBy: 'checkPage' })
  if (chromium.status === 'needs')
    return { status: 'needs' as const, tool: chromium.tool, name: chromium.name, canInstall: chromium.canInstall, missingLibs: [], get: chromium.get }
  const bin = chromium.bins[0] ?? chromium.path
  const missing = await missingLibs(bin)
  if (missing.length)
    return { status: 'needs' as const, tool: chromium.tool, name: 'Chromium system libraries', canInstall: false, missingLibs: missing, get: { apt: CHROMIUM_LIBS_APT } }

  const url = `http://127.0.0.1:${running.port}${path.startsWith('/') ? path : `/${path}`}`
  const browser = await puppeteer.launch({ executablePath: bin, headless: 'shell', args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ 'x-pikku-studio': running.token })
    const errors: string[] = []
    const failedRequests: string[] = []
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
    page.on('pageerror', (error) => errors.push(error instanceof Error ? error.message : String(error)))
    page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`.trim()))
    page.on('response', (response) => response.status() >= 400 && failedRequests.push(`${response.url()} ${response.status()}`))
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
    return { status: 'checked' as const, url, httpStatus: response?.status() ?? null, title: await page.title(), errors, failedRequests }
  } finally {
    await browser.close()
  }
}
