import { useMemo } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import type { Theme } from '../types/designTypes'

type ProjectTheme = {
  id: string
  name: string
  primary: string
  secondary: string | null
  background: string | null
  foreground: string | null
  heading: string
  body: string
  radius: string
  scheme: string
}

const fontKey = (name: string) =>
  /mono|courier|typewriter/i.test(name) ? 'type' : /serif|georgia|times|playfair|merriweather|lora/i.test(name) && !/sans/i.test(name) ? 'serif' : /round|nunito|quicksand|varela|poppins/i.test(name) ? 'rounded' : 'modern'

const radii: Record<string, number> = { none: 0, sm: 6, md: 10, lg: 14, xl: 22, full: 22 }

const toTheme = (t: ProjectTheme): Theme => ({
  name: t.name,
  acc: t.primary,
  sup: t.secondary ?? t.primary,
  bg: t.background ?? '#FFFFFF',
  ink: t.foreground ?? '#1E2328',
  hf: fontKey(t.heading),
  bf: fontKey(t.body),
  r: radii[t.radius] ?? 10,
  mode: t.scheme === 'dark' ? 'dark' : t.scheme === 'auto' ? 'auto' : 'light',
  auto: true,
  shade: 4,
  grad: 'none',
  sh: 'soft',
})

export function useProjectThemes(): { themes: Record<string, Theme> | null; current: string } {
  const key = useProjectKey()
  const query = usePikkuQuery('studio:listThemes', { key }, { enabled: !!key } as never)
  const data = query.data as { active: string; themes: ProjectTheme[] } | undefined
  return useMemo(() => {
    if (!data || data.themes.length === 0) return { themes: null, current: '' }
    return { themes: Object.fromEntries(data.themes.map((t) => [t.id, toTheme(t)])), current: data.active }
  }, [data])
}
