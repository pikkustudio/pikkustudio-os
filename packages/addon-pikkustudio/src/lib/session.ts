import { ForbiddenError } from '@pikku/core/errors'
import type { PikkuHTTP } from '@pikku/core/http'

type AuthFactory = () => Promise<{
  api: {
    signInLocal: (input: { headers: Headers; asResponse: true }) => Promise<Response>
    signOut: (input: { headers: Headers; asResponse: true }) => Promise<Response>
  }
}>

export const requestHeaders = (http?: PikkuHTTP) => new Headers(http?.request?.headers() ?? {})

export const passCookies = (from: Response, http?: PikkuHTTP) => {
  const cookies = from.headers.getSetCookie()
  if (cookies.length) http?.response?.header('Set-Cookie', cookies)
}

export const startSession = async (auth: unknown, http?: PikkuHTTP) => {
  const signedIn = await ((await (auth as AuthFactory)()).api.signInLocal({
    headers: requestHeaders(http),
    asResponse: true,
  }))
  if (!signedIn.ok) throw new ForbiddenError('Studio only signs in from this computer')
  passCookies(signedIn, http)
}

export const endSession = async (auth: unknown, http?: PikkuHTTP) =>
  passCookies(
    await (await (auth as AuthFactory)()).api.signOut({ headers: requestHeaders(http), asResponse: true }),
    http
  )
