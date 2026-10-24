// The last page the person was on, so `/` can take them back to it. Kept apart from router.tsx:
// routes import it, and router.tsx imports every route.
const LAST_PAGE = 'studio:last-page'
const welcome = /^\/([^/]+\/)?(sign-in|your-name|choose-ai|new-project)?\/?$/
const signedOut = /^\/(login|signup|cli-auth|oauth|app\/auth)(\/|$)/

export const lastPage = () => {
  try {
    const page = localStorage.getItem(LAST_PAGE) ?? undefined
    return page && !signedOut.test(page) ? page : undefined
  } catch {
    return undefined
  }
}

export const rememberPage = ({ pathname, search, hash }: { pathname: string; search: string; hash: string }) => {
  if (welcome.test(pathname) || signedOut.test(pathname)) return
  try {
    localStorage.setItem(LAST_PAGE, pathname + search + hash)
  } catch {}
}
