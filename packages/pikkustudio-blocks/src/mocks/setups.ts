import { asI18nStub, type I18nString } from '@pikku/react'

export type RowKey = 'money' | 'start' | 'auto' | 'screens'
export type Wire = 'plans' | 'calendar' | 'book' | 'pay' | 'account' | 'receipt' | 'credits' | 'list'

export type Auto =
  | { kind: 'workflow'; title: I18nString; steps: I18nString[] }
  | { kind: 'agent'; title: I18nString; says: I18nString; tools: I18nString[] }

export type Setup = {
  id: string
  name: I18nString
  line: I18nString
  money: { text: I18nString; unique?: boolean }
  start: { text: I18nString; steps: I18nString[]; unique?: boolean }
  auto: { runs: Auto; person: I18nString; unique?: boolean }
  screens: { items: Array<{ name: I18nString; wire: Wire }>; unique?: boolean }
}

export const idea = { text: asI18nStub('A gym app'), who: asI18nStub('for a neighbourhood gym with three classes a day') }

export const rowLabels: Record<RowKey, { label: I18nString; hint: I18nString }> = {
  money: { label: asI18nStub('How money comes in'), hint: asI18nStub('What people pay, and when') },
  start: { label: asI18nStub('How a customer gets started'), hint: asI18nStub('From first visit to first class') },
  auto: { label: asI18nStub('What runs by itself and what you handle'), hint: asI18nStub('The routine work, and the work that is still yours') },
  screens: { label: asI18nStub('Key screens'), hint: asI18nStub('What people see') },
}

export const setups: Setup[] = [
  {
    id: 'membership',
    name: asI18nStub('Membership'),
    line: asI18nStub('Members pay every month and come as often as they like.'),
    money: { text: asI18nStub('A monthly fee, charged automatically. It renews until the member cancels.') },
    start: { text: asI18nStub('Sign up, pick a plan, add a card, book a first class.'), steps: [asI18nStub('Make an account'), asI18nStub('Pick a plan'), asI18nStub('Add a card'), asI18nStub('Book a class')] },
    auto: {
      runs: { kind: 'agent', title: asI18nStub('Your booking helper'), says: asI18nStub('Your Tuesday class is full. Want Thursday at the same time?'), tools: [asI18nStub('Class calendar'), asI18nStub('Member list'), asI18nStub('Send a message')] },
      person: asI18nStub('You handle cancellations, freezes and anything a member is unhappy about.'),
    },
    screens: {
      items: [
        { name: asI18nStub('Plans'), wire: 'plans' },
        { name: asI18nStub('Class calendar'), wire: 'calendar' },
        { name: asI18nStub('My membership'), wire: 'account' },
      ],
    },
  },
  {
    id: 'class-packs',
    name: asI18nStub('Class packs'),
    line: asI18nStub('People buy a bundle of classes once and use them over time.'),
    money: { text: asI18nStub('A one-off payment for a pack, such as 10 classes. No renewals unless they buy again.'), unique: true },
    start: { text: asI18nStub('Sign up, buy a pack, book a class with a credit.'), steps: [asI18nStub('Make an account'), asI18nStub('Buy a pack'), asI18nStub('Book with a credit')] },
    auto: {
      runs: { kind: 'workflow', title: asI18nStub('Every night'), steps: [asI18nStub('Check each pack'), asI18nStub('Expire unused credits'), asI18nStub('Send a reminder'), asI18nStub('Offer a new pack')] },
      person: asI18nStub('You handle refunds, extending a pack, and one-to-one requests.'),
      unique: true,
    },
    screens: {
      items: [
        { name: asI18nStub('Packs'), wire: 'plans' },
        { name: asI18nStub('Class calendar'), wire: 'calendar' },
        { name: asI18nStub('My credits'), wire: 'credits' },
      ],
      unique: true,
    },
  },
  {
    id: 'drop-in',
    name: asI18nStub('Drop-in'),
    line: asI18nStub('Anyone can turn up and pay for a single class. No account.'),
    money: { text: asI18nStub('Pay per class, at the moment of booking. Nothing stored for later.'), unique: true },
    start: { text: asI18nStub('Pick a class, pay, get a confirmation by email.'), steps: [asI18nStub('Pick a class'), asI18nStub('Pay'), asI18nStub('Get a confirmation')], unique: true },
    auto: {
      runs: { kind: 'workflow', title: asI18nStub('After each booking'), steps: [asI18nStub('Take payment'), asI18nStub('Send confirmation')] },
      person: asI18nStub('You handle everything else: the door list, refunds and regulars.'),
    },
    screens: {
      items: [
        { name: asI18nStub('Class calendar'), wire: 'calendar' },
        { name: asI18nStub('Pay'), wire: 'pay' },
        { name: asI18nStub('Confirmation'), wire: 'receipt' },
      ],
      unique: true,
    },
  },
]

export type WishlistEntry = { kind: 'knowledge'; tags: ['wishlist']; sourceSetup: string; part: RowKey | 'whole'; title: string }
export type ChangesetDraft = { title: string; setup: string; parts: RowKey[] }

export const toWishlistEntry = (s: Setup, part: RowKey): WishlistEntry => ({ kind: 'knowledge', tags: ['wishlist'], sourceSetup: s.id, part, title: `${s.name}: ${rowLabels[part].label}` })
export const toChangesetDraft = (s: Setup): ChangesetDraft => ({ title: `Set up the gym app as ${s.name}`, setup: s.id, parts: ['money', 'start', 'auto', 'screens'] })

export const addToWishlist = async (_entry: WishlistEntry) => ({ ok: true as const })
export const createChangeset = async (_draft: ChangesetDraft) => ({ ok: true as const })
