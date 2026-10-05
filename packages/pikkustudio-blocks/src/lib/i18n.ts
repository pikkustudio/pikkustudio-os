export const MISSING_MARKER = '%i18n-missing%'

export const isMissing = (value: string | undefined) => value === undefined || value.includes(MISSING_MARKER)

export const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'yi'])
export const isRtl = (code: string) => RTL.has(code.split('-')[0]!)
