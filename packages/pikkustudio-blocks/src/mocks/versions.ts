import { asI18nStub, type I18nString } from '@pikku/react'

export type Outcome = 'live' | 'was-live' | 'failed' | 'rolled-back' | 'cancelled' | 'working' | 'waiting'

export type Flag = { id: string; level: 'security' | 'breaking' | 'tests'; text: I18nString }
export type Missing = { id: string; kind: 'secret' | 'setting'; name: I18nString; why: I18nString; placeholder: I18nString }
export type Group = { label: I18nString; added: I18nString[]; removed: I18nString[]; changed: I18nString[] }

export type Version = {
  id: string
  v: string
  sha: string
  title: I18nString
  summary: I18nString
  day: string
  time: string
  by: I18nString
  outcome: Outcome
  /** Plain-words reason it did not go live. */
  reason?: I18nString
  failedAt?: 'build' | 'start' | 'publish' | 'data'
  took?: string
  liveSince?: string
  replaces?: string
  visits?: number
  /** 0-4 while working: fetch, build, test, check, live. */
  phase?: number
  started?: string
  tests?: { passed: number; failed: number; skipped: number; secs: number }
  flags: Flag[]
  missing: Missing[]
  /** Everything bundled into this version: one deploy is often several saves or a merge. */
  includes?: string[]
  groups: Group[]
  log: string
}

export const steps = [
  ['Fetching your work', 25],
  ['Building it', 150],
  ['Testing it', 60],
  ['Checking it', 15],
  ['Going live', 70],
] as Array<[string, number]>

// Group headings, stubbed once. Each is the part kind the app also keys icons on.
const pages = asI18nStub('Pages')
const routines = asI18nStub('Routines')
const secretCodes = asI18nStub('Secret codes')
const settings = asI18nStub('Settings')

const ok = (n: number) => ({ passed: n, failed: 0, skipped: 0, secs: 41 })

export const versions: Version[] = [
  {
    id: 'v9',
    v: '1.5.0',
    sha: '4be91c2',
    title: asI18nStub('Let people pay when they book'),
    summary: asI18nStub('Adds a Pay button to the booking page and takes card payments through Stripe.'),
    day: 'Today',
    time: '12:31',
    by: asI18nStub('Maya Okafor'),
    outcome: 'working',
    phase: 1,
    started: '2 minutes ago',
    flags: [],
    missing: [],
    includes: ["Let people pay when they book", "Show the price on each class", "Fix the booking page on phones"],
    groups: [
      { label: pages, added: [asI18nStub('Pay for a booking')], removed: [], changed: [asI18nStub('Book a class')] },
      { label: routines, added: [asI18nStub('Take a payment')], removed: [], changed: [asI18nStub('Confirm a booking')] },
      { label: secretCodes, added: [asI18nStub('Stripe secret code')], removed: [], changed: [] },
    ],
    log: '[12:31:02] Fetching your work\n[12:31:09] Installing what it needs\n[12:31:41] Building 14 pages and 6 routines\n[12:32:20] Still building…',
  },
  {
    id: 'v8',
    v: '1.4.3',
    sha: '91d07fa',
    title: asI18nStub('Add a class waiting list'),
    summary: asI18nStub('When a class is full, people can join a waiting list and get an email if a seat opens.'),
    day: 'Today',
    time: '11:20',
    by: asI18nStub('Tom Becker'),
    outcome: 'waiting',
    reason: asI18nStub('Needs a few things from you first.'),
    tests: ok(18),
    flags: [{ id: 'f1', level: 'breaking', text: asI18nStub('It removes the "allergies" box from the old booking form. People who already filled it in will lose that answer.') }],
    missing: [{ id: 'm1', kind: 'setting', name: asI18nStub('Waiting-list sender address'), why: asI18nStub('The address the "a seat opened" email comes from.'), placeholder: asI18nStub('classes@bakeryclasses.example') }],
    includes: ["Add a class waiting list", "Tell the waiting list a seat opened", "Remove the old allergies box"],
    groups: [
      { label: pages, added: [asI18nStub('Join the waiting list')], removed: [], changed: [asI18nStub('Book a class')] },
      { label: routines, added: [asI18nStub('Tell the waiting list a seat opened')], removed: [], changed: [] },
      { label: settings, added: [asI18nStub('Waiting-list sender address')], removed: [], changed: [] },
    ],
    log: '[11:20:04] Fetching your work\n[11:21:30] Built 15 pages and 7 routines\n[11:22:45] 18 checks passed\n[11:22:58] Waiting for you to approve',
  },
  {
    id: 'v7',
    v: '1.4.2',
    sha: 'c3a58e1',
    title: asI18nStub('Confirm bookings by email'),
    summary: asI18nStub('Sends the visitor an email as soon as their seat is saved.'),
    day: 'Today',
    time: '09:05',
    by: asI18nStub('GitHub'),
    outcome: 'live',
    took: '4 minutes 12 seconds',
    liveSince: 'Today, 09:05',
    replaces: 'Version 1.4.1, live since Saturday 17:58',
    visits: 214,
    tests: ok(17),
    flags: [],
    missing: [],
    includes: ["Confirm bookings by email", "Use the bakery name in emails"],
    groups: [
      { label: routines, added: [], removed: [], changed: [asI18nStub('Confirm a booking')] },
      { label: settings, added: [], removed: [], changed: [asI18nStub('Email sending address')] },
    ],
    log: '[09:01:11] Fetching your work\n[09:02:03] Built 14 pages and 6 routines\n[09:03:12] 17 checks passed\n[09:04:40] Putting it live\n[09:05:23] Live',
  },
  {
    id: 'v6',
    v: '1.4.1',
    sha: '2fd6b40',
    title: asI18nStub('Show class photos'),
    summary: asI18nStub('Adds a photo to every class card.'),
    day: 'Yesterday',
    time: '17:40',
    by: asI18nStub('Priya Nair'),
    outcome: 'failed',
    failedAt: 'build',
    reason: asI18nStub('A page asks for a photo file that was removed.'),
    took: '1 minute 50 seconds',
    flags: [],
    missing: [],
    groups: [{ label: pages, added: [], removed: [], changed: [asI18nStub('Classes'), asI18nStub('Book a class')] }],
    log: '[17:40:02] Fetching your work\n[17:40:48] Building 14 pages\n[17:41:51] Error: the page "Classes" asks for ./photos/sourdough.jpg, which is not there\n[17:41:52] Stopped. The live version was not touched.',
  },
  {
    id: 'v5',
    v: '1.4.0',
    sha: '7ab13c9',
    title: asI18nStub('Write the class reminders for you'),
    summary: asI18nStub('A routine emails everyone booked for tomorrow, the evening before.'),
    day: 'Yesterday',
    time: '10:12',
    by: asI18nStub('Maya Okafor'),
    outcome: 'was-live',
    took: '3 minutes 40 seconds',
    liveSince: 'Yesterday, 10:12',
    replaces: 'Version 1.3.2',
    tests: ok(15),
    flags: [],
    missing: [],
    includes: ["Write the class reminders for you", "Tidy the reminder wording", "Stop reminders for cancelled bookings"],
    groups: [{ label: routines, added: [asI18nStub('Send class reminders')], removed: [], changed: [] }],
    log: '[10:08:30] Fetching your work\n[10:10:44] 15 checks passed\n[10:12:09] Live',
  },
  {
    id: 'v4',
    v: '1.3.3',
    sha: '5c8e770',
    title: asI18nStub('Change the homepage wording'),
    summary: asI18nStub('A shorter headline on the homepage.'),
    day: 'Yesterday',
    time: '09:30',
    by: asI18nStub('GitHub'),
    outcome: 'cancelled',
    reason: asI18nStub('A newer version replaced it before it went live.'),
    flags: [],
    missing: [],
    groups: [{ label: pages, added: [], removed: [], changed: [asI18nStub('Home')] }],
    log: '[09:30:01] Fetching your work\n[09:30:40] Cancelled: a newer version was published',
  },
  {
    id: 'v3',
    v: '1.3.2',
    sha: 'e12b4d8',
    title: asI18nStub('New homepage banner'),
    summary: asI18nStub('A banner for the autumn classes.'),
    day: 'Friday, 2 Oct',
    time: '16:02',
    by: asI18nStub('Aiko Tanaka'),
    outcome: 'rolled-back',
    reason: asI18nStub('You went back to the version before it.'),
    took: '3 minutes 5 seconds',
    liveSince: 'Friday, 16:02',
    replaces: 'Version 1.3.1',
    tests: ok(14),
    flags: [],
    missing: [],
    groups: [{ label: pages, added: [asI18nStub('Autumn banner')], removed: [], changed: [asI18nStub('Home')] }],
    log: '[16:00:04] Fetching your work\n[16:02:20] Live\n[Sat 08:15] Went back to the version before it',
  },
  {
    id: 'v2',
    v: '1.3.1',
    sha: 'b90af36',
    title: asI18nStub('Let people cancel a booking'),
    summary: asI18nStub('A Cancel button on the booking email.'),
    day: 'Friday, 2 Oct',
    time: '10:44',
    by: asI18nStub('Tom Becker'),
    outcome: 'was-live',
    took: '3 minutes 30 seconds',
    liveSince: 'Friday, 10:44',
    replaces: 'Version 1.3.0',
    tests: ok(14),
    flags: [],
    missing: [],
    groups: [{ label: routines, added: [asI18nStub('Cancel a booking')], removed: [], changed: [] }],
    log: '[10:41:00] Fetching your work\n[10:44:30] Live',
  },
]

/** Changes saved on the project that are not live yet, newest first. Publishing takes all of them. */
export const heads = [
  { sha: 'a77d1f3', title: 'Tweak the booking page wording', by: 'Tom Becker', when: '12 minutes ago' },
  { sha: '3e90b1c', title: 'Fix the booking page on phones', by: 'Maya Okafor', when: '1 hour ago' },
  { sha: '8d2c7f4', title: 'Show the price on each class', by: 'Maya Okafor', when: '2 hours ago' },
  { sha: 'c41a9e0', title: 'Use the bakery name in emails', by: 'Priya Nair', when: 'Today, 10:02' },
]
