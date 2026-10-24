import { asI18n, type I18nString } from '@pikku/react'

export const MISSING_MARKER = '%i18n-missing%'

export const isMissing = (value: string | undefined) => value === undefined || value.includes(MISSING_MARKER)

export const languageName = (code: string): I18nString => {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
    return asI18n(name)
  } catch {
    return asI18n(code)
  }
}

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'yi'])
export const isRtl = (code: string) => RTL.has(code.split('-')[0]!)
