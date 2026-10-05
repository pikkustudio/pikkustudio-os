export type Note = {
  id: string
  sec: string
  t: string
  sum: string
  body: string[]
  links: string[]
  det: { kind: string; status: string; updated: string }
  plan?: { step: number; done: number; total: number }
}

