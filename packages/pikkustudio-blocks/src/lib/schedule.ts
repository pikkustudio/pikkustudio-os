import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'

const num = (v: string) => (/^\d+$/.test(v) ? Number(v) : undefined)

const list = (v: string, min: number, max: number): number[] | undefined => {
  const out: number[] = []
  for (const part of v.split(',')) {
    const [a, b] = part.split('-').map(num)
    if (a === undefined || a < min || a > max) return undefined
    if (part.includes('-')) {
      if (b === undefined || b < a || b > max) return undefined
      for (let i = a; i <= b; i++) out.push(i)
    } else out.push(a)
  }
  return out
}

const step = (v: string) => {
  const s = /^\*\/(\d+)$/.exec(v)
  return s ? Number(s[1]) : undefined
}

const join = (items: string[]) => new Intl.ListFormat(getLocale(), { type: 'conjunction' }).format(items)
const clock = (hour: number, minute: number) => new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, hour, minute)))
// 2024-01-07 was a Sunday, so day 0 lands on Sunday as in cron.
const dayName = (day: number) => new Intl.DateTimeFormat(getLocale(), { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + (day % 7))))

/** A five-field cron schedule in the person's own words, or undefined when it is too unusual to say simply. */
export function describeSchedule(cron: string): I18nString | undefined {
  const fields = cron.trim().split(/\s+/)
  if (fields.length !== 5) return undefined
  const [minute, hour, dom, month, dow] = fields
  if (month !== '*') return undefined
  const everyDay = dom === '*' && dow === '*'

  if (everyDay && hour === '*') {
    if (minute === '*') return m.schedule__every_minute()
    const n = step(minute)
    if (n) return n === 1 ? m.schedule__every_minute() : m.schedule__every_minutes({ count: n })
    const at = num(minute)
    if (at !== undefined) return at === 0 ? m.schedule__every_hour() : m.schedule__every_hour_past({ minute: at })
    return undefined
  }

  const at = num(minute)
  if (at === undefined || at > 59) return undefined

  if (everyDay) {
    const n = step(hour)
    if (n) return n === 1 ? (at === 0 ? m.schedule__every_hour() : m.schedule__every_hour_past({ minute: at })) : m.schedule__every_hours({ count: n })
  }

  const hours = list(hour, 0, 23)
  if (!hours) return undefined
  const time = asI18n(join(hours.map((h) => clock(h, at))))

  if (everyDay) return m.schedule__every_day_at({ time })

  if (dom === '*') {
    const days = list(dow, 0, 7)
    if (!days) return undefined
    const set = [...new Set(days.map((d) => d % 7))].sort((a, b) => a - b)
    if (set.join() === '1,2,3,4,5') return m.schedule__weekdays_at({ time })
    if (set.join() === '0,6') return m.schedule__weekends_at({ time })
    const ordered = [...set.filter((d) => d !== 0), ...set.filter((d) => d === 0)]
    return m.schedule__days_at({ days: asI18n(join(ordered.map(dayName))), time })
  }

  if (dow === '*') {
    const days = list(dom, 1, 31)
    if (!days || days.length !== 1) return undefined
    return m.schedule__monthly_at({ day: days[0], time })
  }

  return undefined
}
