import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

// The words a host can change without touching a screen: who hosts the work, what the brand is called,
// what signing in means. Each entry is a function so the text follows the active language.
// Open defaults say nothing about any hosting service; an addon rewords them by overriding these message keys
// (its package.json `studio.overrides`, merged in by scripts/gen-addons.mjs).
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
  /** Second card in the difference panel; left out while its title is empty, as it is in the open build. */
  diffHosted: { title: () => I18nString; text: () => I18nString }
  /** Third reason in "Why this one". */
  whyNoBillText: () => I18nString
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
  noticeDenied: (p: { what: I18nString }) => I18nString
  noticeSignedOut: (p: { what: I18nString }) => I18nString
  aiHostedChosen: (p: { who: I18nString }) => I18nString
  signInNote: (p: { who: I18nString }) => I18nString
  signOutNote: (p: { who: I18nString }) => I18nString
}

export const defaultCopy: Copy = {
  brandName: m.copy__brand_name,
  brandLabel: m.copy__brand_label,
  stepSignInHint: m.copy__step_sign_in_hint,
  railPitch: m.copy__rail_pitch,
  diffLocal: m.copy__diff_local,
  diffHosted: { title: m.copy__diff_hosted_title, text: m.copy__diff_hosted_text },
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
  noticeDenied: m.action_notice__denied_access,
  noticeSignedOut: m.action_notice__signed_out,
  aiHostedChosen: m.updates_feed__ai_hosted,
  signInNote: m.updates_feed__sign_in,
  signOutNote: m.updates_feed__sign_out,
}

export const useCopy = (): Copy => defaultCopy
