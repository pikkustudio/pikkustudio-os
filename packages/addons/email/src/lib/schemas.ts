import { z } from 'zod'

export const InboxStatusSchema = z.enum(['captured', 'sent', 'rejected'])

export const InboxSummarySchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  stage: z.string().nullable(),
  from: z.string().nullable(),
  to: z.array(z.string()),
  subject: z.string(),
  templateName: z.string().nullable(),
  templateLocale: z.string().nullable(),
  status: InboxStatusSchema,
  deployRef: z.string().nullable(),
  createdAt: z.date(),
})

export const HighlightsSchema = z.object({
  primary: z
    .union([
      z.object({ kind: z.literal('link'), value: z.string(), label: z.string() }),
      z.object({ kind: z.literal('code'), value: z.string() }),
    ])
    .nullable(),
  links: z.array(z.object({ url: z.string(), label: z.string() })),
  codes: z.array(z.string()),
})

export const InboxEmailSchema = InboxSummarySchema.extend({
  cc: z.array(z.string()),
  bcc: z.array(z.string()),
  html: z.string(),
  text: z.string(),
  highlights: HighlightsSchema,
})

export const RecordedEmailSchema = z.object({
  from: z.string().nullable().default(null),
  to: z.array(z.string()).min(1).max(200),
  cc: z.array(z.string()).max(200).default([]),
  bcc: z.array(z.string()).max(200).default([]),
  subject: z.string().max(1000).default(''),
  html: z.string().max(2_000_000).default(''),
  text: z.string().max(1_000_000).default(''),
  templateName: z.string().max(200).nullable().default(null),
  templateLocale: z.string().max(40).nullable().default(null),
  deployRef: z.string().max(200).nullable().default(null),
})
