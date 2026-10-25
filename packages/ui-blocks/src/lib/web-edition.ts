export const WEB_UNAVAILABLE = ['secrets', 'studio-metrics', 'resume', 'addons', 'add-ons', 'choose-ai'] as const
export type WebUnavailable = (typeof WEB_UNAVAILABLE)[number]

/** The first path segment when it is a local-only page the web edition answers with the "not available" screen. */
export const webUnavailableRoute = (path: string): WebUnavailable | undefined => {
  const first = path.split('/').filter(Boolean)[0]
  return WEB_UNAVAILABLE.find((r) => r === first)
}
