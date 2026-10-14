export async function projectInvoke<T>(projectKey: string, name: string, data?: unknown): Promise<T> {
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rpcName: name, data }),
  }
  const res = await fetch(`${window.location.origin}/p/${projectKey}/rpc/${name}`, { ...init, credentials: 'include' })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = Object.assign(new Error(body?.message ?? body?.error ?? res.statusText), { status: res.status })
    if (typeof body?.name === 'string') error.name = body.name
    throw error
  }
  return body as T
}
