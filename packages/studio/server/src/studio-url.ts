export const studioUrl = (apiUrl: string, override = process.env.STUDIO_URL) => {
  if (override) return override.replace(/\/$/, '')
  const url = new URL(apiUrl)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') url.port = '4741'
  else if (url.hostname === 'api.pikkustudio.app') url.hostname = 'cloud.pikkustudio.app'
  else url.hostname = url.hostname.replace(/^api\./, 'studio.')
  return url.origin
}
