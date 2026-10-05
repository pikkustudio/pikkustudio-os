export type Mode = 'theme' | 'element' | 'component' | 'translations' | 'chat' | 'none'
export type Device = 'computer' | 'tablet' | 'phone'
export type Kind = 'button' | 'heading' | 'text' | 'card'
export type Theme = {
  name: string
  acc: string
  sup: string
  bg: string
  ink: string
  hf: string
  bf: string
  r: number
  mode: 'light' | 'dark' | 'auto'
  auto: boolean
  shade: number
  grad: 'none' | 'soft' | 'strong'
  sh: 'none' | 'soft' | 'strong'
}
export type Styles = Record<string, string>
export type Translations = Record<string, Record<'en' | 'de' | 'ar', string>>
export type Selection = {
  id: string
  kind: Kind
  name: string
  i18n?: string
  count: number
  base: { background: string; color: string; fontSize: number; fontWeight: number; padding: number; textAlign: string; borderRadius: number; borderWidth: number; borderColor: string }
}
