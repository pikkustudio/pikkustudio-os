export const cloudUnreachable = (error: unknown) => {
  if (error instanceof TypeError) return true
  const status = (error as { status?: number } | null)?.status
  return status === 502 || status === 503 || status === 504
}
