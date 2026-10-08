import { m } from '@/i18n/messages'
import { asI18nStub, type I18nString } from '@pikku/react'

export type State = 'needs' | 'working' | 'waiting' | 'done' | 'aside'

export type Msg = { who: 'you' | 'pikku'; text: I18nString; when: I18nString }

export type Change = {
  id: string
  title: I18nString
  from: I18nString
  state: State
  when: I18nString
  set: string
  asks?: I18nString
  now?: I18nString
  what: I18nString[]
  nothing?: I18nString[]
  details: I18nString
  thread: Msg[]
}

export type Set = { id: string; title: I18nString; state: State; note: I18nString }

export const SETS: Set[] = [
  { id: 's1', title: asI18nStub('Book a class for two'), state: 'needs', note: asI18nStub('Ready for you to look at') },
  { id: 's2', title: asI18nStub('Try the app with virtual users'), state: 'working', note: asI18nStub('Pikku is building it') },
  { id: 's3', title: asI18nStub('Smaller fixes'), state: 'waiting', note: asI18nStub('Waiting its turn') },
  { id: 's0', title: asI18nStub('Your first version'), state: 'done', note: asI18nStub('Kept on Monday') },
]

export const CHANGES: Change[] = [
  {
    id: 'c1',
    title: asI18nStub('Let a guest reserve two seats at once'),
    from: asI18nStub('You'),
    state: 'needs',
    when: asI18nStub('12 minutes ago'),
    set: 's1',
    asks: asI18nStub('Should the second seat be held for you if the guest does not pay straight away?'),
    what: [asI18nStub('The class page gets a "How many seats?" choice, one or two'), asI18nStub('Booking two seats takes two places in the class'), asI18nStub('The confirmation email lists both names')],
    nothing: [asI18nStub('Prices stay the same'), asI18nStub('Existing bookings are not touched')],
    details: asI18nStub('bookings: add seats (int, default 1)\nclass-page: SeatPicker\nemail: booking-confirmed gets guests[]'),
    thread: [
      { who: 'you', text: asI18nStub('Let a guest reserve two seats at once. People keep booking twice.'), when: asI18nStub('12 min ago') },
      { who: 'pikku', text: asI18nStub('Done on a copy of your app. One thing to check before it goes live: should the second seat be held for you if the guest does not pay straight away?'), when: asI18nStub('9 min ago') },
    ],
  },
  {
    id: 'c2',
    title: asI18nStub('Show how many seats are left on each class'),
    from: asI18nStub('Tom, a virtual user'),
    state: 'needs',
    when: asI18nStub('Today, 9:40'),
    set: 's1',
    what: [asI18nStub('Each class shows "3 seats left" under its time'), asI18nStub('It says "Full" and hides the button when there are none')],
    nothing: [asI18nStub('Nobody is turned away who already booked')],
    details: asI18nStub('class-card: remaining = capacity - booked\nbook-button: disabled when remaining === 0'),
    thread: [
      { who: 'pikku', text: asI18nStub('Tom could not tell whether Saturday was full and tried to book it twice. I have fixed that on the copy.'), when: asI18nStub('9:42') },
    ],
  },
  {
    id: 'c3',
    title: asI18nStub('Turn on virtual users'),
    from: asI18nStub('You'),
    state: 'working',
    when: asI18nStub('Today, 9:10'),
    set: 's2',
    now: asI18nStub('Switching it on, then trying a visit to make sure it works'),
    what: [asI18nStub('Virtual users can visit your preview site'), asI18nStub('A new Virtual users page shows what they found')],
    nothing: [asI18nStub('Your live site and real customers are never visited')],
    details: asI18nStub('pikku.config.json: scaffold.virtualUser = true\nregenerate: runVirtualUser'),
    thread: [
      { who: 'you', text: asI18nStub('Turn on virtual users'), when: asI18nStub('9:10') },
      { who: 'pikku', text: asI18nStub('On it. This changes your project settings and nothing your visitors can see.'), when: asI18nStub('9:11') },
    ],
  },
  {
    id: 'c4',
    title: asI18nStub('Make Hana, Tom and Priya the first three visitors'),
    from: m.parts__pikku(),
    state: 'working',
    when: asI18nStub('Today, 9:12'),
    set: 's2',
    now: asI18nStub('Writing what each of them is trying to do'),
    what: [asI18nStub('Three kinds of visitor, each with their own goals')],
    details: asI18nStub('personas: hana, tom, priya'),
    thread: [],
  },
  {
    id: 'c5',
    title: asI18nStub('Make the booking button green'),
    from: asI18nStub('You'),
    state: 'waiting',
    when: asI18nStub('Yesterday'),
    set: 's3',
    what: [asI18nStub('The "Book now" button turns green on every page')],
    nothing: [asI18nStub('No other colours change')],
    details: asI18nStub('theme.primary: teal-600 -> green-600'),
    thread: [{ who: 'you', text: asI18nStub('Make the booking button green'), when: asI18nStub('Yesterday') }],
  },
  {
    id: 'c6',
    title: asI18nStub('Say "Saturday" instead of "Sat." in the class list'),
    from: asI18nStub('The live site'),
    state: 'waiting',
    when: asI18nStub('Yesterday'),
    set: 's3',
    what: [asI18nStub('Day names are written out in full')],
    details: asI18nStub('i18n: day.short -> day.long (class-list)'),
    thread: [],
  },
  {
    id: 'c7',
    title: asI18nStub('Add a waiting list when a class is full'),
    from: asI18nStub('You'),
    state: 'aside',
    when: asI18nStub('Last week'),
    set: 's3',
    what: [asI18nStub('A guest can join a waiting list and is told if a seat opens')],
    details: asI18nStub('new table: waitlist\nworkflow: seat-opened'),
    thread: [{ who: 'you', text: asI18nStub('Not yet, after the first launch.'), when: asI18nStub('Last week') }],
  },
  {
    id: 'c8',
    title: asI18nStub('First version: classes, booking, confirmation email'),
    from: asI18nStub('You'),
    state: 'done',
    when: asI18nStub('Monday'),
    set: 's0',
    what: [asI18nStub('People can see classes, book one and get an email')],
    details: asI18nStub('14 files, 3 tables, 2 emails'),
    thread: [{ who: 'pikku', text: asI18nStub('Built, tested in English and German, and published to your preview site.'), when: asI18nStub('Monday') }],
  },
]

const LABEL: Record<State, () => I18nString> = {
  needs: m.changes_data__state_needs,
  working: m.changes_data__state_working,
  waiting: m.changes_data__state_waiting,
  done: m.changes_data__state_done,
  aside: m.changes_data__state_aside,
}

export const labelOf = (s: State): I18nString => LABEL[s]()

export const byState = (s: State) => CHANGES.filter((c) => c.state === s)
export const inSet = (id: string) => CHANGES.filter((c) => c.set === id)

export type Status = 'open' | 'claimed' | 'needs_answer' | 'in_progress' | 'done' | 'dismissed'

export type Real = {
  shortId: I18nString
  status: Status
  source: 'panel' | 'console' | 'system'
  route?: I18nString
  circled?: I18nString
  shot?: I18nString
  branch?: string
  commit?: string
  approval?: boolean
  approvedBy?: I18nString
  options?: I18nString[]
  evidence?: { label: I18nString; kind: 'option' | 'evidence' }[]
  live: I18nString
}

export const REAL: Record<string, Real> = {
  c1: { shortId: asI18nStub('#12'), status: 'needs_answer', source: 'console', route: asI18nStub('/classes/saturday'), circled: asI18nStub('Book now button'), shot: asI18nStub('Class page, before'), branch: 'changeset/book-for-two', commit: 'a41f9c2', approval: true, options: [asI18nStub('Hold the seat for 15 minutes'), asI18nStub('Release it straight away'), asI18nStub('Hold it until I confirm')], evidence: [{ label: asI18nStub('Two seats, held'), kind: 'option' }, { label: asI18nStub('Two seats, released'), kind: 'option' }], live: asI18nStub('On your copy only. Not on your preview or live site yet.') },
  c2: { shortId: asI18nStub('#13'), status: 'in_progress', source: 'system', route: asI18nStub('/classes'), circled: asI18nStub('Saturday 10:00 class card'), shot: asI18nStub('Tom stuck on Saturday'), branch: 'changeset/book-for-two', commit: '7be03d1', approval: true, evidence: [{ label: asI18nStub('Tom tried to book it twice'), kind: 'evidence' }], live: asI18nStub('On your copy only. Not on your preview or live site yet.') },
  c3: { shortId: asI18nStub('#14'), status: 'in_progress', source: 'console', branch: 'changeset/virtual-users', live: asI18nStub('Not started on your preview yet.') },
  c4: { shortId: asI18nStub('#15'), status: 'in_progress', source: 'system', branch: 'changeset/virtual-users', live: asI18nStub('Not started on your preview yet.') },
  c5: { shortId: asI18nStub('#16'), status: 'open', source: 'panel', route: asI18nStub('/classes/saturday'), circled: asI18nStub('Book now button'), shot: asI18nStub('Button as it is today'), live: asI18nStub('Not started.') },
  c6: { shortId: asI18nStub('#17'), status: 'open', source: 'panel', route: asI18nStub('/classes'), circled: asI18nStub('"Sat." in the class list'), live: asI18nStub('Not started.') },
  c7: { shortId: asI18nStub('#11'), status: 'dismissed', source: 'console', live: asI18nStub('Set aside. Nothing was changed.') },
  c8: { shortId: asI18nStub('#1'), status: 'done', source: 'console', branch: 'main', commit: '3c90e17', approvedBy: asI18nStub('You, on Monday'), live: asI18nStub('On your preview site. Not on your live site.') },
}
