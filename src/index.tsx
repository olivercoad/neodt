import { createMemo, createSignal, Index, splitProps, type JSX } from 'solid-js'
import { DateTime } from 'luxon'
import './styles.css'

export type DateTimeLocalValue = `${number}-${number}-${number}T${number}:${number}` | ''
type SegmentName = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'dayPeriod'
type Segment = { type: SegmentName; value: string; editable: true }
type DisplayPart = Segment | { type: string; value: string; editable: false }

export interface DateTimeLocalProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Date and time used as the basis for empty values and two-digit years. */
  referenceTime: DateTime
  /** An ISO local date-time (`YYYY-MM-DDTHH:mm`) with no time-zone offset. */
  value?: DateTimeLocalValue
  /** Initial value when the component is uncontrolled. */
  defaultValue?: DateTimeLocalValue
  /** Locale used for the visible date and time, independent of the browser locale. */
  locale?: Intl.LocalesArgument
  /** Options affecting the visible locale formatting, such as `hour12` or `hourCycle`. */
  formatOptions?: Intl.DateTimeFormatOptions
  /** Prevents editing while retaining the displayed value. */
  readonly?: boolean
  /** Prevents focus and editing. */
  disabled?: boolean
  /** Called whenever the local date-time changes. */
  onValueChange?: (value: DateTimeLocalValue) => void
}

const editableTypes = new Set<SegmentName>(['year', 'month', 'day', 'hour', 'minute', 'dayPeriod'])

function parseLocal(value: string): DateTime | undefined {
  if (!value) return undefined
  const date = DateTime.fromISO(value, { zone: 'utc' })
  return date.isValid ? date : undefined
}

function toLocalValue(date: DateTime): DateTimeLocalValue {
  return date.toFormat("yyyy-MM-dd'T'HH:mm") as DateTimeLocalValue
}

function localeName(locale: Intl.LocalesArgument | undefined): string | undefined {
  return Array.isArray(locale) ? locale[0] : locale
}

function partsFor(value: string, locale: Intl.LocalesArgument | undefined, options: Intl.DateTimeFormatOptions | undefined): DisplayPart[] {
  const date = parseLocal(value) ?? DateTime.fromObject({ year: 2001, month: 2, day: 3, hour: 4, minute: 5 }, { zone: 'utc' })
  const localizedDate = localeName(locale) ? date.setLocale(localeName(locale)!) : date
  return localizedDate.toLocaleParts({ year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', ...options }).map(part =>
    editableTypes.has(part.type as SegmentName)
      ? { type: part.type as SegmentName, value: part.value, editable: true }
      : { type: part.type, value: part.value, editable: false },
  )
}

function digitLimit(segment: SegmentName): number {
  return segment === 'year' ? 4 : segment === 'dayPeriod' ? 0 : 2
}

function isCompleteSegment(segment: SegmentName, digits: string, hour12: boolean): boolean {
  if (digits.length === digitLimit(segment)) return true
  const maximum = segment === 'month' ? 12
    : segment === 'day' ? 31
      : segment === 'hour' ? (hour12 ? 12 : 23)
        : segment === 'minute' ? 59
          : undefined
  return maximum !== undefined && Number(digits) * 10 > maximum
}

function closestYear(twoDigitYear: string, referenceTime: DateTime): number {
  const candidate = Math.floor(referenceTime.year / 100) * 100 + Number(twoDigitYear)
  if (candidate - referenceTime.year > 50) return candidate - 100
  if (referenceTime.year - candidate > 50) return candidate + 100
  return candidate
}

/** A locale-aware, keyboard-editable local date and time control for Solid SPAs. */
export function DateTimeLocal(props: DateTimeLocalProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'referenceTime', 'value', 'defaultValue', 'locale', 'formatOptions', 'onValueChange', 'readonly', 'class', 'classList', 'disabled', 'aria-label',
  ])
  const [uncontrolledValue, setUncontrolledValue] = createSignal<DateTimeLocalValue>(local.defaultValue ?? '')
  const [selected, setSelected] = createSignal(0)
  const [typed, setTyped] = createSignal<{ index: number; digits: string } | undefined>()
  const value = () => local.value ?? uncontrolledValue()
  const segments = createMemo(() => partsFor(value(), local.locale, local.formatOptions))
  const editableSegments = createMemo(() => segments().filter((part): part is Segment => part.editable))
  const segmentButtons: HTMLButtonElement[] = []

  const emitValue = (next: DateTimeLocalValue) => {
    if (local.value === undefined) setUncontrolledValue(next)
    local.onValueChange?.(next)
  }

  const selectSegment = (index: number, focus = false) => {
    const next = Math.max(0, Math.min(index, editableSegments().length - 1))
    const pending = typed()
    if (pending?.digits.length === 2 && pending.index !== next && editableSegments()[pending.index]?.type === 'year') {
      setSegment('year', `${closestYear(pending.digits, local.referenceTime)}`)
    }
    setSelected(next)
    setTyped(undefined)
    if (focus) segmentButtons[next]?.focus()
  }

  const changeSegment = (segment: SegmentName, amount: number) => {
    if (local.disabled || local.readonly) return
    let date = (parseLocal(value()) ?? local.referenceTime.toUTC()).startOf('minute')
    switch (segment) {
      case 'year': date = date.plus({ years: amount }); break
      case 'month': date = date.plus({ months: amount }); break
      case 'day': date = date.plus({ days: amount }); break
      case 'hour': date = date.plus({ hours: amount }); break
      case 'minute': date = date.plus({ minutes: amount }); break
      case 'dayPeriod': date = date.plus({ hours: date.hour < 12 ? 12 : -12 }); break
    }
    emitValue(toLocalValue(date))
  }

  const setSegment = (segment: SegmentName, digits: string) => {
    if (local.disabled || local.readonly || segment === 'dayPeriod') return
    const number = Number(digits)
    if (!Number.isFinite(number)) return
    let date = (parseLocal(value()) ?? local.referenceTime.toUTC()).startOf('minute')
    if (segment === 'year' && number >= 1) date = date.set({ year: number })
    if (segment === 'month' && number >= 1 && number <= 12) date = date.set({ month: number })
    if (segment === 'day' && number >= 1 && number <= 31) date = date.set({ day: number })
    if (segment === 'hour') {
      const hour12 = new Intl.DateTimeFormat(local.locale, { hour: 'numeric', ...local.formatOptions }).resolvedOptions().hour12
      if (hour12 && number >= 1 && number <= 12) date = date.set({ hour: (date.hour >= 12 ? 12 : 0) + (number % 12) })
      if (!hour12 && number >= 0 && number <= 23) date = date.set({ hour: number })
    }
    if (segment === 'minute' && number >= 0 && number <= 59) date = date.set({ minute: number })
    emitValue(toLocalValue(date))
  }

  const onSegmentKeyDown = (event: KeyboardEvent, index: number, segment: Segment) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); selectSegment(index - 1, true); return }
    if (event.key === 'ArrowRight') { event.preventDefault(); selectSegment(index + 1, true); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); changeSegment(segment.type, 1); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); changeSegment(segment.type, -1); return }
    if (event.key === 'Home') { event.preventDefault(); selectSegment(0, true); return }
    if (event.key === 'End') { event.preventDefault(); selectSegment(editableSegments().length - 1, true); return }
    if (segment.type === 'dayPeriod' && /^(a|p)$/i.test(event.key)) {
      event.preventDefault()
      const isMorning = (parseLocal(value())?.hour ?? 0) < 12
      if ((event.key.toLowerCase() === 'a') !== isMorning) changeSegment(segment.type, 1)
      return
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      const previous = typed()?.index === index ? typed()?.digits ?? '' : ''
      const digits = `${previous}${event.key}`.slice(-digitLimit(segment.type))
      setTyped({ index, digits })
      setSegment(segment.type, digits)
      const hour12 = new Intl.DateTimeFormat(local.locale, { hour: 'numeric', ...local.formatOptions }).resolvedOptions().hour12 ?? false
      if (isCompleteSegment(segment.type, digits, hour12)) selectSegment(index + 1, true)
    }
  }

  return (
    <span {...rest} class={`datetime-neo ${local.class ?? ''}`} classList={local.classList} data-disabled={local.disabled ? '' : undefined}>
      <span class="datetime-neo__editor" role="group" aria-label={local['aria-label'] ?? 'Date and time'}>
        <Index each={segments()}>{part => part().editable ? (() => {
          const index = () => editableSegments().findIndex(segment => segment.type === part().type)
          return <button
             ref={element => (segmentButtons[index()] = element)}
             class="datetime-neo__segment"
             classList={{ 'datetime-neo__segment--selected': selected() === index() }}
            type="button"
            disabled={local.disabled}
            aria-label={part().type}
            aria-selected={selected() === index()}
            onFocus={() => selectSegment(index())}
            onClick={() => selectSegment(index())}
            onKeyDown={event => onSegmentKeyDown(event, index(), part() as Segment)}
          >{value() ? part().value : '--'}</button>
        })() : <span class="datetime-neo__separator" aria-hidden="true">{part().value}</span>}</Index>
      </span>
    </span>
  )
}

export { DateTimeLocal as DateTimeNeo }
