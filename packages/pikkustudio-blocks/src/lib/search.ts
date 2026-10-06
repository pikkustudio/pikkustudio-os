export const validateStudioSearch = (s: Record<string, unknown>): { size?: 'mobile' | 'tablet' | 'small' | 'big'; embed?: '1'; mock?: string; run?: string; project?: string; view?: 'healthy' | 'empty' | 'problem' | 'loading' | 'error' | 'restore-error'; look?: 'light' | 'dark'; panel?: 'chat' | 'updates' | 'workspace' | 'diff' | 'why' | 'local' | 'accounts' | 'keys' | 'litellm' | 'fabric'; pitch?: 'a' | 'b'; via?: string; show?: 'done' | 'returning' | 'company' | 'empty' | 'loading' | 'error' | 'signin' | 'notin' | 'publishing' | 'live'; note?: string; email?: string; lang?: 'en' | 'de' | 'ar'; device?: 'phone' | 'text'; mode?: 'theme' | 'element' | 'component' | 'translations' | 'chat' | 'none'; screen?: 'tablet' | 'phone'; app?: 'staff'; pg?: string; item?: string } => {
    const pick = <T extends string>(v: unknown, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : undefined)
    return {
      size: pick(s.size, ['mobile', 'tablet', 'small', 'big'] as const),
      embed: s.embed === '1' || s.embed === 1 ? ('1' as const) : undefined,
      view: pick(s.view, ['healthy', 'empty', 'problem', 'loading', 'error', 'restore-error'] as const),
      look: pick(s.look, ['light', 'dark'] as const),
      panel: pick(s.panel, ['chat', 'updates', 'workspace', 'options', 'diff', 'why', 'local', 'accounts', 'keys', 'provider', 'litellm', 'fabric'] as const),
      via: typeof s.via === 'string' ? s.via : undefined,
      pitch: pick(s.pitch, ['a', 'b'] as const),
      show: pick(s.show, ['done', 'returning', 'company', 'empty', 'loading', 'error', 'signin', 'notin', 'publishing', 'live'] as const),
      project: typeof s.project === 'string' && s.project ? s.project : undefined,
      run: typeof s.run === 'string' ? s.run : undefined,
      mock: typeof s.mock === 'string' ? s.mock : undefined,
      note: typeof s.note === 'string' ? s.note : undefined,
      email: typeof s.email === 'string' ? s.email : undefined,
      lang: pick(s.lang, ['en', 'de', 'ar'] as const),
      device: pick(s.device, ['phone', 'text'] as const),
      mode: pick(s.mode, ['theme', 'element', 'component', 'translations', 'chat', 'none'] as const),
      screen: pick(s.screen, ['tablet', 'phone'] as const),
      app: pick(s.app, ['staff'] as const),
      pg: typeof s.pg === 'string' ? s.pg : undefined,
      item: typeof s.item === 'string' ? s.item : undefined,
    }
  
}
