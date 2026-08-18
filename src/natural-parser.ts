import { DateTime, type DurationUnit } from 'luxon'

export interface NaturalDateParseOptions {
  /** The instant used for relative expressions and omitted years. */
  referenceTime: DateTime
  /** IANA zone in which date-only and wall-clock expressions are interpreted. */
  zone?: string
  /** Locale used to disambiguate short numeric dates such as `8/4`. */
  locale?: Intl.LocalesArgument
}

const months: Record<string, number> = {
  january: 1,
  jan: 1,
  j: 1,
  february: 2,
  feb: 2,
  febuary: 2,
  f: 2,
  march: 3,
  mar: 3,
  m: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

const weekdays: Record<string, number> = {
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  sunday: 7,
  sun: 7,
}

const counts: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
}
const aliases: Record<string, string> = {
  tomorow: 'tomorrow',
  tmrw: 'tomorrow',
  tmrrw: 'tomorrow',
  '2mrw': 'tomorrow',
  pluz: 'plus',
  wks: 'weeks',
  wk: 'week',
  hrs: 'hours',
  hr: 'hour',
}

type Clock = { hour: number; minute: number }

/** Parses one natural-language date-time. Deliberately does not parse date ranges. */
export function parseNaturalDate(
  value: string,
  options: NaturalDateParseOptions,
): DateTime | undefined {
  const zone = options.zone ?? options.referenceTime.zoneName ?? undefined
  if (!zone || !DateTime.now().setZone(zone).isValid) return undefined
  const now = options.referenceTime.setZone(zone).startOf('minute')
  const input = normalize(value)
  if (!input) return undefined
  if (input === 'now') return now

  const iso = DateTime.fromISO(value.trim(), { setZone: true })
  if (iso.isValid && /\d{4}-\d{2}-\d{2}/.test(value)) return iso.setZone(zone).startOf('minute')

  const zoned = value
    .trim()
    .match(/^(.*?)(?:\s+(America\/[\w-]+|Europe\/[\w-]+|Australia\/[\w-]+|Asia\/[\w-]+|UTC))$/i)
  if (zoned) {
    const parsed = parseNaturalDate(zoned[1]!, { ...options, zone: zoned[2]! })
    return parsed?.setZone(zone)
  }

  const arithmetic = input.match(/^(.+?)(?:\s*\+\s*|\s+plus\s+)(.+)$/)
  if (arithmetic) {
    const base = parseNaturalDate(arithmetic[1]!, options)
    const duration = parseDuration(arithmetic[2]!)
    return base && duration ? base.plus(duration).startOf('minute') : undefined
  }
  const relative = input.match(
    /^in\s+(.+)$|^(.+)\s+ago$|^(.+)\s+in the past$|^(.+?)\s+from\s+(.+)$/,
  )
  if (relative) {
    const durationText = relative[1] ?? relative[2] ?? relative[3] ?? relative[4]
    const duration = durationText ? parseDuration(durationText) : undefined
    const base = relative[5] ? parseNaturalDate(relative[5], options) : now
    const direction = relative[2] || relative[3] ? -1 : 1
    return base && duration
      ? base.plus(scaleDuration(duration, direction)).startOf('minute')
      : undefined
  }

  const withClock = splitClock(input)
  const date = parseDate(withClock.date, now, options.locale)
  if (date) return applyClock(date, withClock.clock).startOf('minute')

  const clock = parseClock(input)
  if (clock) {
    const today = applyClock(now.startOf('day'), clock)
    return (today >= now ? today : today.plus({ days: 1 })).startOf('minute')
  }
  return undefined
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(token => aliases[token] ?? token)
    .join(' ')
}

function splitClock(input: string): { date: string; clock?: Clock } {
  const match = input.match(
    /^(.*?)(?:\s+(?:at\s+)?((?:\d{1,2}(?::\d{2})\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))|noon|midnight))$/,
  )
  if (!match || !match[1]) return { date: input }
  return { date: match[1].trim(), clock: parseClock(match[2]!) }
}

function parseClock(value: string): Clock | undefined {
  const input = value.trim()
  if (input === 'noon') return { hour: 12, minute: 0 }
  if (input === 'midnight') return { hour: 0, minute: 0 }
  const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return undefined
  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  if (minute > 59 || hour > 23 || (!match[3] && hour > 23) || (match[3] && (hour < 1 || hour > 12)))
    return undefined
  if (match[3] === 'pm' && hour !== 12) hour += 12
  if (match[3] === 'am' && hour === 12) hour = 0
  return { hour, minute }
}

function parseDate(
  input: string,
  now: DateTime,
  locale?: Intl.LocalesArgument,
): DateTime | undefined {
  const dayWords: Record<string, number> = {
    today: 0,
    tomorrow: 1,
    yesterday: -1,
    'day after tomorrow': 2,
    'day before yesterday': -2,
    'the day after tomorrow': 2,
    'the day before yesterday': -2,
  }
  if (input in dayWords) return now.startOf('day').plus({ days: dayWords[input] })

  const weekday = input.match(/^(?:(next|last|this)\s+)?([a-z]+)$/)
  const weekdayToken = weekday?.[2]
  if (weekdayToken && weekdays[weekdayToken]) {
    const wanted = weekdays[weekdayToken]!
    const direction = weekday[1] === 'last' ? -1 : 1
    let distance = direction * ((wanted - now.weekday + (direction > 0 ? 7 : -7)) % 7)
    if (distance === 0 && weekday[1] !== 'this') distance = direction * 7
    return now.startOf('day').plus({ days: distance })
  }

  const numeric = input.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const parts = numericDateParts(first, second, locale)
    return parts
      ? makeDate(
          now,
          numeric[3] ? normalizeYear(numeric[3], now.year) : now.year,
          parts[0],
          parts[1],
        )
      : undefined
  }
  const textual = input.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{2,4}))?$/)
  const monthToken = textual?.[1]
  if (textual && monthToken && months[monthToken])
    return makeDate(
      now,
      textual[3] ? normalizeYear(textual[3], now.year) : now.year,
      months[monthToken]!,
      Number(textual[2]),
    )
  const reverseTextual = input.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{2,4}))?$/)
  const reverseMonthToken = reverseTextual?.[2]
  if (reverseTextual && reverseMonthToken && months[reverseMonthToken])
    return makeDate(
      now,
      reverseTextual[3] ? normalizeYear(reverseTextual[3], now.year) : now.year,
      months[reverseMonthToken]!,
      Number(reverseTextual[1]),
    )
  const ordinal = input.match(/^(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)$/)
  if (ordinal) {
    const candidate = makeDate(now, now.year, now.month, Number(ordinal[1]))
    return candidate && candidate < now.startOf('day')
      ? candidate
          .plus({ months: 1 })
          .startOf('month')
          .set({ day: Number(ordinal[1]) })
      : candidate
  }
  return undefined
}

function numericDateParts(
  first: number,
  second: number,
  locale?: Intl.LocalesArgument,
): [number, number] | undefined {
  if (first < 1 || second < 1 || first > 31 || second > 31) return undefined
  const dayFirst = localeUsesDayFirst(locale)
  const month = dayFirst ? second : first
  const day = dayFirst ? first : second
  return month <= 12 ? [month, day] : undefined
}

function localeUsesDayFirst(locale: Intl.LocalesArgument | undefined): boolean {
  const parts = new Intl.DateTimeFormat(locale ?? 'en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(Date.UTC(2001, 1, 3)))
  return (
    parts.findIndex(part => part.type === 'day') < parts.findIndex(part => part.type === 'month')
  )
}

function makeDate(now: DateTime, year: number, month: number, day: number): DateTime | undefined {
  const date = DateTime.fromObject({ year, month, day }, { zone: now.zoneName ?? undefined })
  return date.isValid ? date.startOf('day') : undefined
}

function normalizeYear(raw: string, referenceYear: number): number {
  if (raw.length === 4) return Number(raw)
  const candidate = Math.floor(referenceYear / 100) * 100 + Number(raw)
  return candidate - referenceYear > 50
    ? candidate - 100
    : referenceYear - candidate > 50
    ? candidate + 100
    : candidate
}

function applyClock(date: DateTime, clock?: Clock): DateTime {
  return clock ? date.set(clock) : date
}
function parseDuration(value: string): Partial<Record<DurationUnit, number>> | undefined {
  const match = value
    .trim()
    .match(
      /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)?$/,
    )
  if (!match) return undefined
  const amount = counts[match[1]!] ?? Number(match[1]!)
  const unit = (match[2] ?? 'days').replace(/s$/, '') as DurationUnit
  return Number.isFinite(amount) ? { [unit]: amount } : undefined
}
function scaleDuration(
  duration: Partial<Record<DurationUnit, number>>,
  factor: number,
): Partial<Record<DurationUnit, number>> {
  return Object.fromEntries(
    Object.entries(duration).map(([unit, amount]) => [unit, amount * factor]),
  ) as Partial<Record<DurationUnit, number>>
}
