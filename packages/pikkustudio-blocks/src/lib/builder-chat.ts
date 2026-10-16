import { m } from '@/i18n/messages'
import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { asI18n, type I18nString } from '@pikku/react'
import type { ChatItem } from './chat'
import { useGuideAct, useProjectChecklist, type ActivityKind, type Checklist, type StepAction } from './project-flow'
import type { ChecklistStepId } from './interview'

export const OFFER_MARKER = '[[offer:changeset]]'

const ASK_PATTERN = /\[\[ask:(\{.*\})\]\]/s
const DO_PATTERN = /\[\[do:(\{.*\})\]\]/s

export const stripMarkers = (text: string) => text.split(OFFER_MARKER).join('').replace(ASK_PATTERN, '').replace(DO_PATTERN, '').trim()

const ACTIONS: StepAction[] = ['skip', 'undo', 'start', 'retry', 'fast-track', 'reopen']
const STEPS: ChecklistStepId[] = ['questions', 'explore', 'frontend', 'backend', 'tests', 'publish']

const parseDo = (text: string): { action: StepAction; step: ChecklistStepId; label: string; why: string } | null => {
  const raw = DO_PATTERN.exec(text)?.[1]
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as { action?: unknown; step?: unknown; label?: unknown; why?: unknown }
    const action = ACTIONS.find((a) => a === v.action)
    const step = STEPS.find((x) => x === v.step)
    if (!action || !step || typeof v.label !== 'string' || !v.label.trim()) return null
    return { action, step, label: v.label.trim(), why: typeof v.why === 'string' ? v.why.trim() : '' }
  } catch {
    return null
  }
}

const NOTE_GAP_MS = 25_000

const noteText = (kind: ActivityKind, name: string, building: boolean): I18nString => {
  const n = { name }
  switch (kind) {
    case 'function': return name ? m.project_flow__note_function(n) : m.project_flow__note_function_plain()
    case 'table': return name ? m.project_flow__note_table(n) : m.project_flow__note_table_plain()
    case 'permissions': return m.project_flow__note_permissions()
    case 'screen': return building ? (name ? m.project_flow__note_screen_wire(n) : m.project_flow__note_screen_wire_plain()) : name ? m.project_flow__note_screen(n) : m.project_flow__note_screen_plain()
    case 'mock': return name ? m.project_flow__note_mock(n) : m.project_flow__note_mock_plain()
    case 'test': return name ? m.project_flow__note_test(n) : m.project_flow__note_test_plain()
    case 'docs': return name ? m.project_flow__note_docs(n) : m.project_flow__note_docs_plain()
    case 'emails': return name ? m.project_flow__note_emails(n) : m.project_flow__note_emails_plain()
    case 'publish': return m.project_flow__note_publish()
    default: return m.project_flow__note_check()
  }
}

const parseAsk = (text: string): { question: string; options: string[]; tone: 'info' | 'attention' | 'danger' } | null => {
  const raw = ASK_PATTERN.exec(text)?.[1]
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as { question?: unknown; options?: unknown; tone?: unknown }
    if (typeof v.question !== 'string' || !v.question.trim()) return null
    return { question: v.question.trim(), tone: v.tone === 'attention' || v.tone === 'danger' ? v.tone : 'info', options: Array.isArray(v.options) ? v.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).slice(0, 4) : [] }
  } catch {
    return null
  }
}

export type WorkMode = 'build' | 'frontend' | 'artifacts' | 'knowledge' | 'emails' | 'project'

export const SCREEN_SPECIALIST: ReadonlyArray<readonly [RegExp, WorkMode]> = [
  [/\/artifacts(\/|$)/, 'artifacts'],
  [/\/design$/, 'frontend'],
  [/\/knowledge$/, 'knowledge'],
  [/\/project$/, 'project'],
  [/\/emails$/, 'emails'],
]

export const modeForPath = (path: string): WorkMode | null => SCREEN_SPECIALIST.find(([screen]) => screen.test(path))?.[1] ?? null

const TIMED_OUT = /timed out|took too long/i
/** The builder had no AI to build with: not signed in to Cloud and no key of the user's own. */
export const NO_AI = /Sign in to Pikku Studio Cloud to build with|Choose your AI before building/i

export type BuilderItem = { kind: string; text?: string; at: number; id?: string; name?: string; summary?: string; args?: string; output?: string; status?: string }
type Timed = { at: number; item: ChatItem }

const KICKOFF_TAG = '[[kickoff]]'
const SKIP_TAG = '[[skip]]'
const HIDDEN_TAGS = [KICKOFF_TAG, '[[greet]]', '[[changed:']
const changedTag = (step: string, state: string) => `[[changed:${step}:${state}]]`

const toChat = (all: BuilderItem[], prefix: string, agent?: I18nString): Timed[] => {
  const closing = (index: number) => {
    for (let n = index + 1; n < all.length; n++) {
      if (all[n].kind === 'user') return true
      if (all[n].kind === 'assistant' && all[n].text) return false
    }
    return true
  }
  return all.flatMap((item, index): Timed[] => {
    if (!item.text) return []
    const id = `${prefix}${index}`
    if (item.kind === 'assistant' && !closing(index)) return []
    if (item.kind === 'user') {
      if (HIDDEN_TAGS.some((tag) => item.text!.startsWith(tag))) return []
      return [{ at: item.at, item: { id, kind: 'me', text: item.text.startsWith(SKIP_TAG) ? m.project_flow__skipped_bubble() : item.text } }]
    }
    if (item.kind === 'assistant') {
      const text = stripMarkers(item.text)
      return text ? [{ at: item.at, item: { id, kind: 'pikku', text, ...(agent ? { agent } : {}) } }] : []
    }
    if (item.kind === 'error') return [{ at: item.at, item: { id, kind: 'error', detail: item.text, retry: TIMED_OUT.test(item.text), noAi: NO_AI.test(item.text) } }]
    return []
  })
}

export function useBuilderChat(key: string, mode: WorkMode | null) {
  const guideMode = mode === 'project'
  const state = usePikkuQuery('studio:builderState', { key, specialist: mode ?? undefined }, { enabled: !!mode && !!key, refetchInterval: 2000 } as never)
  const checklist = useProjectChecklist(guideMode ? key : '')
  const list: Checklist | undefined = guideMode ? checklist.data : undefined
  const design = usePikkuQuery('studio:builderState', { key, specialist: 'frontend' }, { enabled: guideMode && !!key && !!list?.handoff, refetchInterval: 2000 } as never)
  const prompt = usePikkuMutation('studio:builderPrompt')
  const guideSay = usePikkuMutation('studio:projectGuideSay' as never) as unknown as UseMutationResult<unknown, Error, { key: string; message?: string; kickoff?: boolean; greet?: boolean; changed?: { step: string; state: string }; skip?: boolean }>
  const guideAct = useGuideAct()
  const archiveChat = usePikkuMutation('studio:builderArchive')
  const [local, setLocal] = useState<Timed[]>([])
  const [sending, setSending] = useState(false)
  const [dismissed, setDismissed] = useState('')
  const noted = useRef({ seen: new Set<string>(), last: 0 })
  const kicked = useRef('')
  const seen = useRef<{ key: string; states: Record<string, string> }>({ key: '', states: {} })
  useEffect(() => setLocal([]), [mode])
  useEffect(() => {
    noted.current = { seen: new Set(), last: 0 }
  }, [key])

  const data = state.data as { busy: boolean; items: BuilderItem[] } | undefined
  const designData = design.data as { busy: boolean; items: BuilderItem[] } | undefined
  const handoff = guideMode && !!list?.handoff
  const designBuilding = list?.steps.find((s) => s.id === 'frontend')?.state === 'working'

  const last = (data?.items ?? []).at(-1)
  const lastText = last?.kind === 'assistant' ? last.text : undefined
  const doing = guideMode && lastText ? parseDo(lastText) : null
  const doStamp = last ? String(last.at) : ''
  const doOffer = doing && doStamp !== dismissed && !!list?.steps.find((s) => s.id === doing.step)?.actions.includes(doing.action) ? doing : null

  const items = useMemo<ChatItem[]>(() => {
    const mine = toChat(data?.items ?? [], 'b', handoff ? m.screen_names__agent_project() : undefined)
    const began = mine[0]?.at ?? 0
    const theirs = handoff ? toChat((designData?.items ?? []).filter((i) => i.at >= began), 'd', m.screen_names__agent_frontend()) : []
    const said = [...mine, ...theirs, ...local].sort((a, b) => a.at - b.at).map((t) => t.item)
    const offered = !!lastText && lastText.includes(OFFER_MARKER)
    const asked = lastText && (!guideMode || list?.questionsOpen) ? parseAsk(lastText) : null
    const card: ChatItem[] = asked
      ? [{ id: 'ask', kind: 'card', toolCallId: 'ask', runId: 'ask', title: asI18n(asked.question), detail: asI18n(asked.question), state: 'ask', options: asked.options.map((o) => asI18n(o)), tone: asked.tone, ...(guideMode ? { skip: true } : {}) }]
      : doOffer
        ? [{ id: 'do', kind: 'card', toolCallId: 'do', runId: 'do', title: asI18n(doOffer.label), detail: asI18n(doOffer.why), state: 'ask', yes: m.project_flow__do_yes(), no: m.project_flow__do_no() }]
        : offered
          ? [{ id: 'offer', kind: 'card', toolCallId: 'offer', runId: 'offer', title: m.builder_chat__bigger_title(), detail: m.builder_chat__bigger_detail(), state: 'ask', yes: m.builder_chat__add_to_queue(), no: m.builder_chat__do_it_now() }]
          : []
    return [...said, ...card]
  }, [data, designData, local, handoff, guideMode, list?.questionsOpen, lastText, doOffer])

  const push = useCallback((item: { kind: 'me' | 'pikku'; text: string }) => {
    setLocal((x) => [...x, { at: Date.now(), item: { id: `l${Math.random()}`, ...item } }])
  }, [])

  const fail = useCallback((error: unknown) => {
    const detail = (error as Error)?.message ?? ''
    setLocal((x) => [...x, { at: Date.now(), item: { id: `l${Math.random()}`, kind: 'error', detail, retry: TIMED_OUT.test(detail), noAi: NO_AI.test(detail) } }])
  }, [])

  const send = useCallback(
    async (text: string) => {
      const experiment = text.match(/^\/experiment(?:\s+([\s\S]*))?$/)
      if (!mode && !experiment) return
      if (experiment && !experiment[1]?.trim()) {
        setLocal((x) => [...x, { at: Date.now(), item: { id: `l${Math.random()}`, kind: 'pikku', text: m.builder_chat__experiment_empty() } }])
        return
      }
      setSending(true)
      try {
        if (guideMode && !experiment) {
          if (designBuilding) await (prompt.mutateAsync as (input: unknown) => Promise<unknown>)({ key, message: text, mode: 'frontend' })
          else await guideSay.mutateAsync({ key, message: text })
          await Promise.all([state.refetch(), checklist.refetch()])
        } else {
          const input = experiment ? { key, message: text.trim(), explore: true, mode: mode ?? undefined } : { key, message: text, mode, offer: mode === 'build' }
          await (prompt.mutateAsync as (input: unknown) => Promise<unknown>)(input)
          await state.refetch()
        }
      } catch (error) {
        fail(error)
      } finally {
        setSending(false)
      }
    },
    [mode, guideMode, designBuilding, key, prompt.mutateAsync, guideSay.mutateAsync, state.refetch, checklist.refetch, fail],
  )

  const skipQuestion = useCallback(async () => {
    setSending(true)
    try {
      await guideSay.mutateAsync({ key, skip: true })
      await Promise.all([state.refetch(), checklist.refetch()])
    } catch (error) {
      fail(error)
    } finally {
      setSending(false)
    }
  }, [key, guideSay.mutateAsync, state.refetch, checklist.refetch, fail])

  useEffect(() => {
    if (!guideMode || !key || !state.isSuccess || !list || kicked.current === key) return
    if (!list.questionsOpen || (data?.items.length ?? 0) > 0 || data?.busy) return
    kicked.current = key
    guideSay.mutateAsync({ key, kickoff: true })
      .then(() => state.refetch())
      .catch(() => {
        kicked.current = ''
      })
  }, [guideMode, key, state.isSuccess, list?.questionsOpen, data?.items.length, data?.busy])

  useEffect(() => {
    if (!guideMode || !key || !state.isSuccess || !list || kicked.current === key) return
    const questions = list.steps[0]
    if (list.questionsOpen || questions.state !== 'skipped' || (data?.items.length ?? 0) > 0 || data?.busy) return
    kicked.current = key
    guideSay.mutateAsync({ key, greet: true })
      .then(() => state.refetch())
      .catch(() => {
        kicked.current = ''
      })
  }, [guideMode, key, state.isSuccess, list?.questionsOpen, list?.steps[0]?.state, data?.items.length, data?.busy])

  useEffect(() => {
    if (!guideMode || !key || !list || !state.isSuccess) return
    const now = Object.fromEntries(list.steps.map((s) => [s.id, s.state])) as Record<string, string>
    const before = seen.current
    seen.current = { key, states: now }
    if (before.key !== key || data?.busy) return
    const changed = list.steps.find((s) => before.states[s.id] === 'working' && (s.state === 'done' || s.state === 'needs-you'))
    if (!changed) return
    const tag = changedTag(changed.id, changed.state)
    if ((data?.items ?? []).some((i) => i.kind === 'user' && i.text?.startsWith(tag))) return
    guideSay.mutateAsync({ key, changed: { step: changed.id, state: changed.state } }).then(() => state.refetch()).catch(() => undefined)
  }, [guideMode, key, list])

  useEffect(() => {
    if (!guideMode || !list) return
    const working = list.steps.find((s) => s.state === 'working')
    if (!working) return
    let id = ''
    let text: I18nString | null = null
    if (working.id === 'explore') {
      if ((working.count ?? 0) > 0) {
        id = `direction:${working.count}`
        text = m.project_flow__note_direction({ count: String(working.count), of: String(working.of ?? 4) })
      }
    } else if (list.activity) {
      id = `${list.activity.kind}:${list.activity.name}`
      text = noteText(list.activity.kind, list.activity.name, working.id === 'backend')
    }
    if (!id || !text || noted.current.seen.has(id)) return
    const at = Date.now()
    if (at - noted.current.last < NOTE_GAP_MS) return
    noted.current.seen.add(id)
    noted.current.last = at
    const line = text
    setLocal((x) => [...x, { at, item: { id: `n${at}`, kind: 'pikku', text: line, quiet: true } }])
  }, [guideMode, list])

  const archive = useCallback(async () => {
    try {
      await (archiveChat.mutateAsync as (input: unknown) => Promise<unknown>)({ key, specialist: mode ?? undefined })
      setLocal([])
      await state.refetch()
    } catch (error) {
      fail(error)
    }
  }, [key, mode, archiveChat.mutateAsync, state.refetch, fail])

  const decide = useCallback(
    async (id: string, yes: boolean) => {
      if (id === 'offer') await send(yes ? m.builder_chat__say_add_to_queue() : m.builder_chat__say_do_it_now())
      if (id === 'do' && doOffer) {
        setDismissed(doStamp)
        if (!yes) return
        try {
          await guideAct.mutateAsync({ key, step: doOffer.step, action: doOffer.action })
          await Promise.all([state.refetch(), checklist.refetch()])
        } catch (error) {
          fail(error)
        }
      }
    },
    [send, doOffer, doStamp, guideAct.mutateAsync, key, state.refetch, checklist.refetch, fail],
  )

  return { items, raw: data?.items ?? [], busy: sending || !!data?.busy, send, decide, push, archive, skipQuestion, archiving: archiveChat.isPending, canArchive: !!mode && !sending && !data?.busy && !archiveChat.isPending && (data?.items ?? []).some((i) => !!i.text && (i.kind === 'user' || i.kind === 'assistant')) }
}

export type SavedChat = { id: string; title: string; at: number }
export type SavedChatFull = SavedChat & { items: BuilderItem[] }

export const useSavedChats = (key: string, enabled: boolean) => {
  const specialist = useLocation({ select: (l) => modeForPath(l.pathname) ?? undefined })
  return usePikkuQuery('studio:builderChats', { key, specialist }, { enabled: enabled && !!key } as never) as unknown as { data?: { chats: SavedChat[] }; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
}

export const useSavedChat = (key: string, id: string | null) =>
  usePikkuQuery('studio:builderChat', { key, id: id ?? '' }, { enabled: !!id && !!key } as never) as unknown as { data?: SavedChatFull; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
