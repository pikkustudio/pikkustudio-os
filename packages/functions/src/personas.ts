/**
 * The people this app is for, and the people its scenarios run as.
 *
 * One `definePersonas` call for the whole project — codegen builds the
 * `PersonaId` union from it, materialises one scenario actor per person, and
 * seeds a user row each, so a second call site would be a second answer to
 * "who uses this app".
 *
 * `visitor` is a PLACEHOLDER for a project with no roles yet. REPLACE it with this
 * app's real people — do not add yours beside it. Declaration order is the ranking,
 * so a leftover `visitor` sorts first and every consumer that takes the first actor
 * (the dev actor switcher, the vision critic) treats a synthetic health-check user
 * as the person this app is for. Declare the primary role — the one who uses the app
 * daily, not the one who administers it — FIRST.
 *
 * Replacing it means four edits in one pass, listed in AGENTS.md: this file,
 * `pikku.config.json`, and the two shipped scenarios that name `actors.visitor`
 * literally. PKU677 requires a browser step's actor to be a literal `actors.<name>`,
 * so those two cannot pick one dynamically — rename the persona without editing them
 * and `actors.visitor` stops type-checking, which fails `pikku all`, and a failed type
 * check means nothing you write afterwards registers at all.
 *
 * Addresses are never written down: each is derived from the persona id and
 * `scenarios.emailDomain` in pikku.config.json, so `visitor` signs in as
 * visitor@actors.local. Writing one by hand is how a run signs in as somebody
 * who was never created.
 */
import { definePersonas } from '#pikku/scopes/pikku-personas.gen.js'

definePersonas({
  maya: {
    name: 'Maya Brandt',
    jobTitle: 'Runs a neighbourhood bakery',
    description: 'Sells bread and cakes, wants an online shop for her bakery, has never written code',
    personality: 'Patient and practical. Reads what is on the screen before touching it, and wants plain words, not technical ones.',
    goals: ['Get an online shop for the bakery', 'Know the app is healthy without asking a developer'],
    account: {},
  },
  theo: {
    name: 'Theo Weber',
    jobTitle: 'Freelance web developer',
    description: 'Builds apps for small shops and checks what Studio generated before handing it over',
    personality: 'Careful and curious. Opens the code, the logs and the version list to be sure of what is running.',
    goals: ['Check what the app does before handing it over', 'See what went live and when'],
    account: {},
  },
  visitor: {
    name: 'Visitor',
    jobTitle: 'Synthetic health-check user',
    personality: 'Signs in and checks their own session — proves auth end to end',
    account: {},
  },
})
