import { z } from 'zod'
import { CHANNELS } from './types.js'

export const InboxChannelSchema = z.enum(CHANNELS)

export const InboxStatusSchema = z.enum(['captured', 'sent', 'rejected'])

export const InboxSummarySchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  stage: z.string().nullable(),
  channel: InboxChannelSchema,
  from: z.string().nullable(),
  to: z.array(z.string()),
  subject: z.string().nullable(),
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

export const InboxMessageSchema = InboxSummarySchema.extend({
  cc: z.array(z.string()),
  bcc: z.array(z.string()),
  html: z.string().nullable(),
  body: z.string(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  highlights: HighlightsSchema,
})

export const RecordedMessageSchema = z.object({
  channel: InboxChannelSchema.default('email'),
  from: z.string().nullable().default(null),
  to: z.array(z.string()).min(1).max(200),
  cc: z.array(z.string()).max(200).default([]),
  bcc: z.array(z.string()).max(200).default([]),
  subject: z.string().max(1000).nullable().default(null),
  html: z.string().max(2_000_000).nullable().default(null),
  body: z.string().max(1_000_000).default(''),
  templateName: z.string().max(200).nullable().default(null),
  templateLocale: z.string().max(40).nullable().default(null),
  deployRef: z.string().max(200).nullable().default(null),
  meta: z.record(z.string(), z.unknown()).nullable().default(null),
})
