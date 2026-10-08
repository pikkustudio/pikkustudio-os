import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useSlots } from './slots'

// The words a host can change without touching a screen: who hosts the work, what the brand is called,
// what signing in means. Each entry is a function so the text follows the active language.
// Open defaults say nothing about any hosting service; a host supplies its own through `Slots.copy`.
export type Copy = {
  /** Wordmark beside the logo on the setup rail, and its accessible name. */
  brandName: () => I18nString
  brandLabel: () => I18nString
  /** Hint under the "Sign in" step of the setup rail. */
  stepSignInHint: () => I18nString
  /** Short line at the foot of the setup rail. */
  railPitch: () => I18nString
  /** "Use it here" card in the difference panel. */
  diffLocal: () => I18nString
  /** Optional second card in the difference panel; left out when a host has nothing to add. */
  diffHosted?: { title: () => I18nString; text: () => I18nString }
  /** Third reason in "Why this one". */
  whyNoBillText: () => I18nString
  /** Where the "see what it costs" button of the pitch panel goes when the account names no address. */
  pitchHref?: string
  /** The Pikku bubble and chat line on the choose-AI step. */
  chatChooseAi: () => I18nString
  bubbleAiPick: () => I18nNode
  bubbleAiDown: () => I18nString
  /** "Nobody else can see this" row. */
  nobodyElseText: () => I18nString
  /** First history row. */
  openedHistory: () => I18nString
  /** Sign-in screen. */
  signedInLead: () => I18nString
  accountFallback: () => I18nString
  signedInCaption: () => I18nString
  startLead: () => I18nString
  useHereNote: () => I18nString
  /** Notes in the updates panel while publishing. */
  publishFailedText: () => I18nString
  publishSignInTitle: () => I18nString
  publishSignInText: () => I18nString
  publishSignInButton: () => I18nString
}

export const defaultCopy: Copy = {
  brandName: m.shell_layout__studio,
  brandLabel: m.shell_layout__studio,
  stepSignInHint: m.copy__step_sign_in_hint,
  railPitch: m.copy__rail_pitch,
  diffLocal: m.copy__diff_local,
  whyNoBillText: m.copy__why_no_bill_text,
  chatChooseAi: m.copy__chat_choose_ai,
  bubbleAiPick: m.copy__bubble_ai_pick,
  bubbleAiDown: m.copy__bubble_ai_down,
  nobodyElseText: m.copy__nobody_else_text,
  openedHistory: m.copy__opened_history,
  signedInLead: m.copy__signed_in_lead,
  accountFallback: m.copy__account_fallback,
  signedInCaption: m.copy__signed_in_caption,
  startLead: m.copy__start_lead,
  useHereNote: m.copy__use_here_note,
  publishFailedText: m.copy__publish_failed_text,
  publishSignInTitle: m.copy__publish_sign_in_title,
  publishSignInText: m.copy__publish_sign_in_text,
  publishSignInButton: m.copy__publish_sign_in_button,
}

export const useCopy = (): Copy => ({ ...defaultCopy, ...useSlots().copy })
