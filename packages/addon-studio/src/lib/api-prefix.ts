import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const apiPrefixOf = (projectDir: string): string => {
  try {
    const config = JSON.parse(readFileSync(join(projectDir, 'pikku.config.json'), 'utf8')) as { globalHTTPPrefix?: unknown }
    const prefix = typeof config.globalHTTPPrefix === 'string' ? config.globalHTTPPrefix.trim().replace(/\/+$/, '') : ''
    return prefix && !prefix.startsWith('/') ? `/${prefix}` : prefix
  } catch {
    return ''
  }
}

export const withApiPrefix = (pathname: string, prefix: string): string =>
  prefix && pathname.startsWith('/rpc/') ? `${prefix}${pathname}` : pathname
