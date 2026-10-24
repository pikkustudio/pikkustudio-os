import { useCallback, useEffect, useState } from 'react'

export type ErrorReport = { name: string; kind: string; errorId?: string; at: string }
export type ErrorReportSender = (report: ErrorReport) => void | Promise<void>

const KEY = 'studio:error-reports'
const EVENT = 'studio:error-reports'

let sender: ErrorReportSender | null = null

export const setErrorReportSender = (fn: ErrorReportSender | null) => {
  sender = fn
  window.dispatchEvent(new Event(EVENT))
}

export type ReportChoice = 'on' | 'off' | 'unset'

const read = (): ReportChoice => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'on' || v === 'off' ? v : 'unset'
  } catch {
    return 'unset'
  }
}

export const reportKind = (f: { message?: string; status?: number }) => {
  const code = /PKU\d+/.exec(f.message ?? '')?.[0]
  return code ?? ((f.status ?? 0) >= 500 ? `http-${f.status}` : 'unclassified')
}

export const anonymise = (f: { name?: string; message?: string; status?: number; errorId?: string }): ErrorReport => ({
  name: f.name ?? 'Error',
  kind: reportKind(f),
  errorId: f.errorId,
  at: new Date().toISOString(),
})

export function useErrorReports() {
  const [choice, setChoice] = useState<ReportChoice>('unset')
  const [canSend, setCanSend] = useState(false)
  useEffect(() => {
    const sync = () => (setChoice(read()), setCanSend(sender !== null))
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  const set = useCallback((v: 'on' | 'off') => {
    try {
      localStorage.setItem(KEY, v)
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }, [])
  const send = useCallback(async (report: ErrorReport) => {
    if (!sender) return false
    try {
      await sender(report)
      return true
    } catch {
      return false
    }
  }, [])
  return { choice, canSend, set, send }
}
