export const checklistEnabled = (key: string) => {
  if (!key) return false
  const at = key.indexOf(':')
  return at <= 0 || key.slice(0, at) === 'cloud'
}
