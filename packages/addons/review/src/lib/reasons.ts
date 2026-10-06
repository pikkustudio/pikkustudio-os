import type { ReviewSubject, VerdictKind } from './types.js'

/**
 * How far a reason can travel. `lint` is decidable from meta alone, so it can
 * become a pikku diagnostic and break the build. `critic` needs a model reading
 * the diff. `human` is taste or product judgement and never leaves the queue.
 */
export type ReasonTier = 'lint' | 'critic' | 'human'

export interface ReviewReason {
  id: string
  label: string
  quick?: string
  subject: ReviewSubject
  kind: VerdictKind
  tier: ReasonTier
  lintKey?: string
  guidance?: string
  check?: string
}

export const REVIEW_REASONS: readonly ReviewReason[] = [
  {
    id: 'services-overreach',
    label: 'Pulls in services it does not use',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'servicesOverreach',
    guidance:
      'Destructure only the services the body actually calls. An unused service in the signature is a false dependency: it blocks tree-shaking and makes the function look like it reaches further than it does.',
  },
  {
    id: 'open-surface',
    label: 'Exposed with no session, scope or permission',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'openSurface',
    guidance:
      'An exposed function states who may call it. Add `auth: true` and a `permissions` entry, or mark it sessionless deliberately because it is genuinely public.',
  },
  {
    id: 'auth-in-body',
    label: 'Checks the session inside the body',
    quick: 'auth in func',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Declare `auth: true` on the wiring so pikku refuses the call before the body runs. A session test in the body is invisible to anything reading the wiring, and every caller has to trust it was not forgotten.',
    check:
      'Does the body test for a session or throw Unauthorized, rather than declaring `auth: true` on the wiring?',
  },
  {
    id: 'permissions-in-body',
    label: 'Authorises inside the body instead of permissions',
    quick: 'permissions in func',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'permissionsInBody',
    guidance:
      'Move the check into the `permissions` field. Authorisation in the body cannot be read off the wiring, so nothing can audit who may call what.',
  },
  {
    id: 'plumbing-only',
    label: 'Pass-through with no wire of its own',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'plumbingOnly',
    guidance:
      'A function that only forwards its input to one call is indirection. Inline it at the call site, or give it the work that justifies its own name.',
  },
  {
    id: 'untyped-output',
    label: 'No output schema',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'untypedOutput',
    guidance:
      'Declare an `output:` zod schema. The schema is the type: without one the generated client falls back to `any` and the frontend drifts silently.',
  },
  {
    id: 'undeclared-errors',
    label: 'Throws errors it never declares',
    subject: 'code',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'undeclaredErrors',
    guidance:
      'List every error class the body throws in the wiring, so the generated client and the API docs carry the failure modes.',
  },
  {
    id: 'swallowed-error',
    label: 'Swallows a failure',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Every caught error surfaces, is logged with context via the injected logger, or is deliberately handled. An empty catch turns a real failure into "nothing happened".',
    check:
      'Is a caught error dropped — an empty catch, `.catch(() => null)`, or a log where the caller needed to know it failed?',
  },
  {
    id: 'wrong-layer',
    label: 'Logic belongs in a service or lib',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'A function orchestrates; the work belongs in a service (needs injected state) or a lib helper (pure). Move the body and call it from here.',
    check:
      'Does the body do work rather than orchestrate it — a query built inline, a transform that belongs in lib, an API call that belongs in a service?',
  },
  {
    id: 'duplicated-logic',
    label: 'Repeats something that already exists',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Something in lib/ or services/ already does this. Find it and call it; if the existing one is close but not right, extend it rather than forking it.',
    check: 'Does this reimplement something the declared services or lib already provide?',
  },
  {
    id: 'missing-validation',
    label: 'Trusts input it should check',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Express the constraint in the input schema so it is rejected before the body runs, rather than checked halfway through.',
    check: 'Does the body check something the input schema could have rejected before it ran?',
  },
  {
    id: 'unclear-naming',
    label: 'Name does not say what it does',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Name it for what a caller gets, not how it works. The name is the whole API for anyone reading the wiring.',
    check: 'Does the name tell a caller what they get, or does it describe the mechanism?',
  },
  {
    id: 'comment-noise',
    label: 'Comments narrate the code',
    quick: 'comment heavy',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Delete comments that narrate the code. A comment earns its place only when a competent reader gets it wrong without it; anything load-bearing belongs in knowledge/, not in the file.',
    check: 'Are there comments narrating what the code already says?',
  },
  {
    id: 'blocking-work',
    label: 'Holds a request open for long work',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Work longer than a few seconds is dispatched fire-and-forget and reports back via callback, queue or webhook. A held-open request cannot survive a rollout or a proxy timeout.',
    check:
      'Does the body hold the request open for work that should be dispatched — a build, a container run, a deploy, a long external call?',
  },
  {
    id: 'hack-workaround',
    label: 'Works around something instead of fixing it',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Fix the cause. A hardcoded id, a sleep covering a race, a cast defeating a type, or a branch for one caller all move the failure somewhere less visible.',
    check:
      'Is there a workaround standing in for a fix — a hardcoded id, a sleep, a retry masking a race, a cast defeating a type, a special case for one caller?',
  },
  {
    id: 'sequential-awaits',
    label: 'Awaits in sequence that could run together',
    quick: 'too many awaits',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Independent awaits go in one `Promise.all`. Sequencing them makes the request as slow as the sum rather than the slowest.',
    check: 'Are there awaits in sequence whose results do not depend on each other?',
  },
  {
    id: 'missing-transaction',
    label: 'Writes that must be atomic are not',
    quick: 'missing transaction',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Writes that must all land or all fail belong in one transaction. Two sequential writes leave a half-applied state on any failure between them.',
    check:
      'Are there multiple writes that must all land or all fail, running outside a transaction?',
  },
  {
    id: 'missing-audit',
    label: 'Mutates without a trail',
    quick: 'missing audit',
    subject: 'code',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'A change a person would later need to reconstruct needs an audit entry. Not every mutation does — this is a judgement about the resource, not a blanket rule.',
    check:
      'Does this mutation change something a person would later need to reconstruct — who did it, when, and to what — with no audit entry to reconstruct it from?',
  },
  {
    id: 'wrong-behaviour',
    label: 'Does the wrong thing',
    subject: 'code',
    kind: 'reject',
    tier: 'human',
    guidance:
      'The behaviour is wrong, not the shape. Read the note for what it should do instead, and change the logic rather than the structure.',
  },
  {
    id: 'over-engineered',
    label: 'More machinery than the problem needs',
    subject: 'code',
    kind: 'reject',
    tier: 'human',
    guidance:
      'Collapse it to the smallest thing that satisfies the requirement. Remove the abstraction layers that have exactly one implementation.',
  },
  {
    id: 'security-concern',
    label: 'Exposes something it should not',
    subject: 'code',
    kind: 'reject',
    tier: 'human',
    guidance:
      'Something reaches a caller that should not see it. Narrow the output schema, tighten the permission, or stop reading the field.',
  },
  {
    id: 'well-shaped',
    label: 'Shape is right for the job',
    subject: 'code',
    kind: 'keep',
    tier: 'critic',
  },
  {
    id: 'good-boundaries',
    label: 'Services, wires and permissions are where they belong',
    subject: 'code',
    kind: 'keep',
    tier: 'critic',
  },
  {
    id: 'exemplar',
    label: 'Worth copying',
    subject: 'code',
    kind: 'keep',
    tier: 'critic',
  },
  {
    id: 'knowledge-wrong',
    label: 'States something untrue',
    subject: 'knowledge',
    kind: 'reject',
    tier: 'human',
    guidance: 'The card states something untrue. Correct it against the code, or delete it.',
  },
  {
    id: 'knowledge-stale',
    label: 'Was true, is not any more',
    subject: 'knowledge',
    kind: 'reject',
    tier: 'human',
    guidance:
      'The card described a real behaviour that has since changed. Rewrite it for how the system works now.',
  },
  {
    id: 'knowledge-unactionable',
    label: 'Describes without saying what to do',
    subject: 'knowledge',
    kind: 'reject',
    tier: 'human',
    guidance:
      'A card says what to do, not what exists. Rewrite it as the rule an agent should follow, in one line.',
  },
  {
    id: 'knowledge-load-bearing',
    label: 'An agent gets this wrong without it',
    subject: 'knowledge',
    kind: 'keep',
    tier: 'human',
  },
  {
    id: 'conditional-hook',
    label: 'Calls a hook inside a condition or loop',
    quick: 'conditional hook',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'conditionalHook',
    guidance:
      'Hooks must run in the same order on every render. Move the call to the top level and put the condition inside the hook, or split the branch into its own component.',
  },
  {
    id: 'effect-without-deps',
    label: 'Effect with no dependency array',
    quick: 'effect, no deps',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'effectWithoutDeps',
    guidance:
      'An effect with no dependency array runs after every render. Give it the values it actually reads, or move the work out of an effect entirely.',
  },
  {
    id: 'state-from-props',
    label: 'Seeds state from a prop',
    quick: 'derived state',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'stateFromProps',
    guidance:
      'useState(prop) captures the first value and then ignores the prop. Derive the value during render, or key the component so a new prop remounts it.',
  },
  {
    id: 'fetch-in-effect',
    label: 'Fetches data in an effect',
    quick: 'fetch in effect',
    subject: 'ui',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Fetching in an effect gives up caching, deduplication, retries and cancellation. Use a query so the data has one owner and one cache key.',
    check:
      'Does an effect call fetch, an rpc, or an async loader and write the result into state, instead of using a query?',
  },
  {
    id: 'no-error-state',
    label: 'Renders a query without an error branch',
    quick: 'no error state',
    subject: 'ui',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'A failed query renders as empty, which reads as "there is nothing here". Show what went wrong and how to retry.',
    check: 'Is the query result rendered without ever reading its error or isError?',
  },
  {
    id: 'no-loading-state',
    label: 'Renders a query without a pending branch',
    quick: 'no loading state',
    subject: 'ui',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Without a pending branch the first paint is an empty shell that then jumps. Render a skeleton the same shape as the loaded content.',
    check:
      'Is the query result rendered without ever reading isPending, isLoading or a suspense boundary?',
  },
  {
    id: 'unhandled-mutation',
    label: 'Mutation with nowhere for the failure to go',
    quick: 'unhandled mutation',
    subject: 'ui',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'A mutation that fails silently leaves the user believing it worked. Surface the error where the action was taken.',
    check: 'Does the mutation declare onError or is its error state rendered anywhere?',
  },
  {
    id: 'broad-invalidation',
    label: 'Invalidates the whole query cache',
    quick: 'broad invalidation',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'broadInvalidation',
    guidance:
      'invalidateQueries with no key refetches every query on the page. Name the keys the mutation actually changed.',
  },
  {
    id: 'component-too-large',
    label: 'Too much in one component',
    quick: 'too large',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'componentTooLarge',
    guidance:
      'Split it where the data changes hands: the part that fetches, the part that decides, and the part that renders. Each should be readable on one screen.',
  },
  {
    id: 'mixed-concerns',
    label: 'Fetches, decides and renders in one place',
    quick: 'mixed concerns',
    subject: 'ui',
    kind: 'reject',
    tier: 'critic',
    guidance:
      'Lift the data access into a hook and leave the component with props it renders. The rendering then tests without a network, and the hook reuses.',
    check:
      'Does this component call rpcs, apply business rules and build deep markup in the same body?',
  },
  {
    id: 'untyped-props',
    label: 'Props are untyped or any',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'untypedProps',
    guidance:
      'Name the props type. Untyped props make every call site a guess and every rename a runtime failure.',
  },
  {
    id: 'hardcoded-copy',
    label: 'User-visible text written inline',
    quick: 'hardcoded copy',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'hardcodedCopy',
    guidance:
      'Move the string into the message catalogue and call it through m. A literal in the markup ships untranslated and cannot be changed without a deploy.',
  },
  {
    id: 'raw-navigation',
    label: 'Navigates outside the router',
    quick: 'raw navigation',
    subject: 'ui',
    kind: 'reject',
    tier: 'lint',
    lintKey: 'rawNavigation',
    guidance:
      'window.location and a bare anchor drop the router state and reload the app. Use the router link or its navigate.',
  },
  {
    id: 'ui-good-states',
    label: 'Loading, error and empty are all handled',
    subject: 'ui',
    kind: 'keep',
    tier: 'critic',
  },
  {
    id: 'ui-clean-boundaries',
    label: 'Renders what it is given, fetches nothing',
    subject: 'ui',
    kind: 'keep',
    tier: 'critic',
  },
  {
    id: 'ui-exemplar',
    label: 'Worth copying',
    subject: 'ui',
    kind: 'keep',
    tier: 'critic',
  },
]

const byId = new Map(REVIEW_REASONS.map((r) => [r.id, r]))

export const reasonById = (id: string): ReviewReason | undefined => byId.get(id)

export const reasonsFor = (subject: ReviewSubject, kind: VerdictKind): ReviewReason[] =>
  REVIEW_REASONS.filter((r) => r.subject === subject && r.kind === kind)

export const isReviewReason = (id: string): boolean => byId.has(id)
