import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type Question = { id: string; q: I18nString; hue: 'teal' | 'petrol' | 'sea'; ask: I18nString[] }

export const questions = (): Question[] => [
  { id: 'away', q: m.explore_sample__away_q(), hue: 'teal', ask: [m.explore_sample__away_ask_1(), m.explore_sample__away_ask_2()] },
  { id: 'secrets', q: m.explore_sample__secrets_q(), hue: 'sea', ask: [m.explore_sample__secrets_ask_1(), m.explore_sample__secrets_ask_2()] },
  { id: 'cost', q: m.explore_sample__cost_q(), hue: 'petrol', ask: [m.explore_sample__cost_ask_1(), m.explore_sample__cost_ask_2()] },
  { id: 'who', q: m.explore_sample__who_q(), hue: 'sea', ask: [m.explore_sample__who_ask_1(), m.explore_sample__who_ask_2()] },
  { id: 'own', q: m.explore_sample__own_q(), hue: 'petrol', ask: [m.explore_sample__own_ask_1(), m.explore_sample__own_ask_2()] },
  { id: 'mem', q: m.explore_sample__mem_q(), hue: 'teal', ask: [m.explore_sample__mem_ask_1(), m.explore_sample__mem_ask_2()] },
  { id: 'well', q: m.explore_sample__well_q(), hue: 'sea', ask: [m.explore_sample__well_ask_1(), m.explore_sample__well_ask_2()] },
  { id: 'ai', q: m.explore_sample__ai_q(), hue: 'teal', ask: [m.explore_sample__ai_ask_1(), m.explore_sample__ai_ask_2()] },
  { id: 'plug', q: m.explore_sample__plug_q(), hue: 'petrol', ask: [m.explore_sample__plug_ask_1(), m.explore_sample__plug_ask_2()] },
]
