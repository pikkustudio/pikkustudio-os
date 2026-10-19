import puppeteer from 'puppeteer-core'

type ChromiumAnswer = { status: 'ready'; bin: string } | { status: 'needs'; tool: string; name: string; canInstall: boolean; missingLibs: string[]; get: Record<string, string | undefined> }

export async function checkPage(chromium: ChromiumAnswer, running: { port: number; token: string }, path: string) {
  if (chromium.status === 'needs') return chromium
  const bin = chromium.bin

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
