import { useMemo, type ReactNode } from 'react'
import { StudioCustomize } from '@pikkustudio/blocks/blocks/CustomizePanel'
import { studioLanguageItem } from '@pikkustudio/blocks/lib/customize'
import { LOCALE_KEY, supportedLocales, useLocale } from '@/i18n/config'
import { usePreferences } from '@/contexts/preferences'

export function CustomizeMount({ children }: { children: ReactNode }) {
  const { locale } = useLocale()
  const { setLocale } = usePreferences()
  const extra = useMemo(() => [studioLanguageItem(supportedLocales, locale, setLocale, LOCALE_KEY)], [locale, setLocale])
  return <StudioCustomize extraItems={extra}>{children}</StudioCustomize>
}
