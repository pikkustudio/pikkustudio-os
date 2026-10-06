export type State = 'needs' | 'working' | 'waiting' | 'done' | 'aside'

export type Msg = { who: 'you' | 'pikku'; text: string; when: string }

export type Change = {
  id: string
  title: string
  from: string
  state: State
  when: string
  set: string
  asks?: string
  now?: string
  what: string[]
  nothing?: string[]
  details: string
  thread: Msg[]
}

export type Set = { id: string; title: string; state: State; note: string }

export const SETS: Set[] = [
  { id: 's1', title: 'Book a class for two', state: 'needs', note: 'Ready for you to look at' },
  { id: 's2', title: 'Try the app with virtual users', state: 'working', note: 'Pikku is building it' },
  { id: 's3', title: 'Smaller fixes', state: 'waiting', note: 'Waiting its turn' },
  { id: 's0', title: 'Your first version', state: 'done', note: 'Kept on Monday' },
]

export const CHANGES: Change[] = [
  {
    id: 'c1',
    title: 'Let a guest reserve two seats at once',
    from: 'You',
    state: 'needs',
    when: '12 minutes ago',
    set: 's1',
    asks: 'Should the second seat be held for you if the guest does not pay straight away?',
    what: ['The class page gets a "How many seats?" choice, one or two', 'Booking two seats takes two places in the class', 'The confirmation email lists both names'],
    nothing: ['Prices stay the same', 'Existing bookings are not touched'],
    details: 'bookings: add seats (int, default 1)\nclass-page: SeatPicker\nemail: booking-confirmed gets guests[]',
    thread: [
      { who: 'you', text: 'Let a guest reserve two seats at once. People keep booking twice.', when: '12 min ago' },
      { who: 'pikku', text: 'Done on a copy of your app. One thing to check before it goes live: should the second seat be held for you if the guest does not pay straight away?', when: '9 min ago' },
    ],
  },
  {
    id: 'c2',
    title: 'Show how many seats are left on each class',
    from: 'Tom, a virtual user',
    state: 'needs',
    when: 'Today, 9:40',
    set: 's1',
    what: ['Each class shows "3 seats left" under its time', 'It says "Full" and hides the button when there are none'],
    nothing: ['Nobody is turned away who already booked'],
    details: 'class-card: remaining = capacity - booked\nbook-button: disabled when remaining === 0',
    thread: [
      { who: 'pikku', text: 'Tom could not tell whether Saturday was full and tried to book it twice. I have fixed that on the copy.', when: '9:42' },
    ],
  },
  {
    id: 'c3',
    title: 'Turn on virtual users',
    from: 'You',
    state: 'working',
    when: 'Today, 9:10',
    set: 's2',
    now: 'Switching it on, then trying a visit to make sure it works',
    what: ['Virtual users can visit your preview site', 'A new Virtual users page shows what they found'],
    nothing: ['Your live site and real customers are never visited'],
    details: 'pikku.config.json: scaffold.virtualUser = true\nregenerate: runVirtualUser',
    thread: [
      { who: 'you', text: 'Turn on virtual users', when: '9:10' },
      { who: 'pikku', text: 'On it. This changes your project settings and nothing your visitors can see.', when: '9:11' },
    ],
  },
  {
    id: 'c4',
    title: 'Make Hana, Tom and Priya the first three visitors',
    from: 'Pikku',
    state: 'working',
    when: 'Today, 9:12',
    set: 's2',
    now: 'Writing what each of them is trying to do',
    what: ['Three kinds of visitor, each with their own goals'],
    details: 'personas: hana, tom, priya',
    thread: [],
  },
  {
    id: 'c5',
    title: 'Make the booking button green',
    from: 'You',
    state: 'waiting',
    when: 'Yesterday',
    set: 's3',
    what: ['The "Book now" button turns green on every page'],
    nothing: ['No other colours change'],
    details: 'theme.primary: teal-600 -> green-600',
    thread: [{ who: 'you', text: 'Make the booking button green', when: 'Yesterday' }],
  },
  {
    id: 'c6',
    title: 'Say "Saturday" instead of "Sat." in the class list',
    from: 'The live site',
    state: 'waiting',
    when: 'Yesterday',
    set: 's3',
    what: ['Day names are written out in full'],
    details: 'i18n: day.short -> day.long (class-list)',
    thread: [],
  },
  {
    id: 'c7',
    title: 'Add a waiting list when a class is full',
    from: 'You',
    state: 'aside',
    when: 'Last week',
    set: 's3',
    what: ['A guest can join a waiting list and is told if a seat opens'],
    details: 'new table: waitlist\nworkflow: seat-opened',
    thread: [{ who: 'you', text: 'Not yet, after the first launch.', when: 'Last week' }],
  },
  {
    id: 'c8',
    title: 'First version: classes, booking, confirmation email',
    from: 'You',
    state: 'done',
    when: 'Monday',
    set: 's0',
    what: ['People can see classes, book one and get an email'],
    details: '14 files, 3 tables, 2 emails',
    thread: [{ who: 'pikku', text: 'Built, tested in English and German, and published to your preview site.', when: 'Monday' }],
  },
]

export const LABEL: Record<State, string> = {
  needs: 'Needs you',
  working: 'Pikku is on it',
  waiting: 'Waiting its turn',
  done: 'Done',
  aside: 'Set aside',
}

export const byState = (s: State) => CHANGES.filter((c) => c.state === s)
export const inSet = (id: string) => CHANGES.filter((c) => c.set === id)

export type Status = 'open' | 'claimed' | 'needs_answer' | 'in_progress' | 'done' | 'dismissed'

export type Real = {
  shortId: string
  status: Status
  source: 'panel' | 'console' | 'system'
  route?: string
  circled?: string
  shot?: string
  branch?: string
  commit?: string
  approval?: boolean
  approvedBy?: string
  options?: string[]
  evidence?: { label: string; kind: 'option' | 'evidence' }[]
  live: string
}

export const REAL: Record<string, Real> = {
  c1: { shortId: '#12', status: 'needs_answer', source: 'console', route: '/classes/saturday', circled: 'Book now button', shot: 'Class page, before', branch: 'changeset/book-for-two', commit: 'a41f9c2', approval: true, options: ['Hold the seat for 15 minutes', 'Release it straight away', 'Hold it until I confirm'], evidence: [{ label: 'Two seats, held', kind: 'option' }, { label: 'Two seats, released', kind: 'option' }], live: 'On your copy only. Not on your preview or live site yet.' },
  c2: { shortId: '#13', status: 'in_progress', source: 'system', route: '/classes', circled: 'Saturday 10:00 class card', shot: 'Tom stuck on Saturday', branch: 'changeset/book-for-two', commit: '7be03d1', approval: true, evidence: [{ label: 'Tom tried to book it twice', kind: 'evidence' }], live: 'On your copy only. Not on your preview or live site yet.' },
  c3: { shortId: '#14', status: 'in_progress', source: 'console', branch: 'changeset/virtual-users', live: 'Not started on your preview yet.' },
  c4: { shortId: '#15', status: 'in_progress', source: 'system', branch: 'changeset/virtual-users', live: 'Not started on your preview yet.' },
  c5: { shortId: '#16', status: 'open', source: 'panel', route: '/classes/saturday', circled: 'Book now button', shot: 'Button as it is today', live: 'Not started.' },
  c6: { shortId: '#17', status: 'open', source: 'panel', route: '/classes', circled: '"Sat." in the class list', live: 'Not started.' },
  c7: { shortId: '#11', status: 'dismissed', source: 'console', live: 'Set aside. Nothing was changed.' },
  c8: { shortId: '#1', status: 'done', source: 'console', branch: 'main', commit: '3c90e17', approvedBy: 'You, on Monday', live: 'On your preview site. Not on your live site.' },
}

export type SetInfo = { creates: string[]; alters: string[]; reads: string[]; needsPlan: boolean; claimedBy?: string; lease?: string }

export const SET_INFO: Record<string, SetInfo> = {
  s1: { creates: [], alters: ['bookings'], reads: ['classes', 'guests'], needsPlan: true, claimedBy: 'Pikku', lease: 'Held for 38 more minutes' },
  s2: { creates: ['virtual_user_runs'], alters: [], reads: ['classes'], needsPlan: true, claimedBy: 'Pikku', lease: 'Held for 51 more minutes' },
  s3: { creates: [], alters: [], reads: ['classes'], needsPlan: false },
  s0: { creates: ['classes', 'bookings', 'guests'], alters: [], reads: [], needsPlan: true },
}

export const SOURCE: Record<Real['source'], string> = {
  console: 'Filed from Studio',
  panel: 'Circled on the live site',
  system: 'Filed by Pikku',
}
