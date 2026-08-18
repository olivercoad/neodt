import {
  createMemo,
  createSignal,
  createUniqueId,
  Index,
  onCleanup,
  splitProps,
  type JSX,
} from 'solid-js'
import { DateTime, Zone } from 'luxon'
import { createElementSize } from '@solid-primitives/resize-observer'
import { getNaturalDateCompletions } from './natural-completion'
import { parseNaturalDate } from './natural-parser'
import { createNaturalPlaceholder } from './natural-placeholder'
import './styles.css'

type SegmentName = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'dayPeriod'
type Segment = { type: SegmentName; value: string; editable: true }
type DisplayPart = Segment | { type: string; value: string; editable: false }

export interface NeodtProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Date and time used as the basis for empty values and two-digit years. */
  referenceTime: DateTime
  /** The selected date and time. Pass `null` for a controlled empty value. */
  value?: DateTime | null
  /** Initial value when the component is uncontrolled. */
  defaultValue?: DateTime
  /** Locale used for the visible date and time. Defaults to the system locale. */
  locale?: Intl.LocalesArgument
  /** Options affecting the visible locale formatting, such as `hour12` or `hourCycle`. */
  formatOptions?: Intl.DateTimeFormatOptions
  /** Shows the selected date's UTC offset beside the visible date and time. */
  showTimeOffset?: boolean
  /** Icon displayed in the button that opens the browser's native date and time picker. */
  calendarIcon?: JSX.Element
  /** Icon displayed in the button that opens natural-language date entry. */
  magicIcon?: JSX.Element
  /** Prevents editing while retaining the displayed value. */
  readonly?: boolean
  /** Prevents focus and editing. */
  disabled?: boolean
  /** Called whenever the selected date and time changes, or `null` when cleared. */
  onValueChange?: (value: DateTime | null) => void
}

const editableTypes = new Set<SegmentName>(['year', 'month', 'day', 'hour', 'minute', 'dayPeriod'])
const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale

function parseLocal(value: string, zone: Zone): DateTime | undefined {
  if (!value) return undefined
  const date = DateTime.fromISO(value, { zone })
  return date.isValid ? date : undefined
}

function toLocalValue(date: DateTime): string {
  return date.toFormat("yyyy-MM-dd'T'HH:mm")
}

function localeName(locale: Intl.LocalesArgument | undefined): string | undefined {
  return Array.isArray(locale) ? locale[0] : locale?.toString()
}

function partsFor(
  value: string,
  zone: Zone,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions | undefined,
): DisplayPart[] {
  const date =
    parseLocal(value, zone) ??
    DateTime.fromObject({ year: 2001, month: 2, day: 3, hour: 4, minute: 5 }, { zone })
  const localizedDate = localeName(locale) ? date.setLocale(localeName(locale)!) : date
  return localizedDate
    .toLocaleParts({
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      ...options,
      timeZoneName: undefined,
    })
    .map(part =>
      editableTypes.has(part.type as SegmentName)
        ? {
            type: part.type as SegmentName,
            value: part.type === 'year' ? part.value.padStart(4, '0') : part.value,
            editable: true,
          }
        : { type: part.type, value: part.value, editable: false },
    )
}

function naturalPreview(
  date: DateTime,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions | undefined,
): string {
  return partsFor(toLocalValue(date), date.zone, locale, options)
    .map(part => part.value)
    .join('')
}

function timeOffset(date: DateTime): string {
  return date.toFormat('ZZ')
}

function digitLimit(segment: SegmentName): number {
  return segment === 'year' ? 4 : segment === 'dayPeriod' ? 0 : 2
}

function placeholderFor(segment: SegmentName): string {
  if (segment === 'year') return 'yyyy'
  if (segment === 'month') return 'mm'
  if (segment === 'day') return 'dd'
  return '--'
}

function isCompleteSegment(segment: SegmentName, digits: string, hour12: boolean): boolean {
  if (digits.length === digitLimit(segment)) return true
  const maximum =
    segment === 'month'
      ? 12
      : segment === 'day'
      ? 31
      : segment === 'hour'
      ? hour12
        ? 12
        : 23
      : segment === 'minute'
      ? 59
      : undefined
  return maximum !== undefined && Number(digits) * 10 > maximum
}

function closestYear(twoDigitYear: string, referenceTime: DateTime): number {
  const candidate = Math.floor(referenceTime.year / 100) * 100 + Number(twoDigitYear)
  if (candidate - referenceTime.year > 50) return candidate - 100
  if (referenceTime.year - candidate > 50) return candidate + 100
  return candidate
}

function CalendarIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function MagicIcon(): JSX.Element {
  return (
    <span class="datetime-neo__magic-icon" aria-hidden="true">
      @
    </span>
  )
}

function ConfirmIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  )
}

function CancelIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

/** A locale-aware, keyboard-editable local date and time control for Solid SPAs. */
function Neodt(props: NeodtProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'referenceTime',
    'value',
    'defaultValue',
    'locale',
    'formatOptions',
    'showTimeOffset',
    'calendarIcon',
    'magicIcon',
    'onValueChange',
    'readonly',
    'class',
    'classList',
    'disabled',
    'aria-label',
  ])
  const locale = () => local.locale ?? systemLocale
  const [uncontrolledValue, setUncontrolledValue] = createSignal<DateTime | undefined>(
    local.defaultValue,
  )
  const [selected, setSelected] = createSignal(0)
  const [allSegmentsSelected, setAllSegmentsSelected] = createSignal(false)
  const [typed, setTyped] = createSignal<{ index: number; digits: string } | undefined>()
  const [naturalText, setNaturalText] = createSignal('')
  const [naturalPlaceholder, setNaturalPlaceholder] = createSignal('')
  const [naturalSuggestion, setNaturalSuggestion] = createSignal(0)
  const [naturalMode, setNaturalMode] = createSignal(false)
  const referenceZone = () => local.referenceTime.zone
  const value = () =>
    (local.value === undefined ? uncontrolledValue() : local.value ?? undefined)?.setZone(
      referenceZone(),
    )
  const [draftDate, setDraftDate] = createSignal(
    (value() ?? local.referenceTime.setZone(referenceZone())).startOf('minute'),
  )
  const nativeValue = () => toLocalValue(value() ?? draftDate())
  const [cleared, setCleared] = createSignal<Set<SegmentName>>(
    new Set(value() ? [] : ['year', 'month', 'day', 'hour', 'minute', 'dayPeriod']),
  )
  const segments = createMemo(() =>
    partsFor(
      toLocalValue(cleared().size ? draftDate() : value() ?? draftDate()),
      referenceZone(),
      locale(),
      local.formatOptions,
    ),
  )
  const editableSegments = createMemo(() =>
    segments().filter((part): part is Segment => part.editable),
  )
  const segmentButtons: HTMLElement[] = []
  const actionButtons: HTMLElement[] = []
  const [activeItem, setActiveItem] = createSignal(0)
  let nativeInput: HTMLInputElement | undefined
  let naturalInput: HTMLInputElement | undefined
  const [actions, setActions] = createSignal<HTMLSpanElement>()
  const actionSize =
    typeof ResizeObserver === 'undefined'
      ? { width: 0 }
      : createElementSize(actions)
  const nativeInputId = createUniqueId()
  let hasOpenedNaturalInput = false
  const naturalPlaceholderAnimation = createNaturalPlaceholder(setNaturalPlaceholder)
  const naturalDate = createMemo(() =>
    parseNaturalDate(naturalText(), {
      referenceTime: local.referenceTime,
      zone: local.referenceTime.zone,
      locale: locale(),
    }),
  )
  const naturalCompletions = createMemo(() => getNaturalDateCompletions(naturalText()))
  const activeNaturalCompletion = createMemo(() => naturalCompletions()[naturalSuggestion()])

  const emitValue = (next: DateTime | undefined) => {
    if (local.value === undefined) setUncontrolledValue(next)
    local.onValueChange?.(next ?? null)
  }

  const isCleared = (segment: SegmentName) => cleared().has(segment)
  const displaySegmentValue = (index: number, segment: Segment) => {
    const pending = typed()
    return segment.type === 'year' && pending?.index === index ? pending.digits : segment.value
  }
  const hasClearedSegment = (segmentsToCheck = cleared()) =>
    editableSegments().some(segment => segmentsToCheck.has(segment.type))

  const commitTypedYear = () => {
    const pending = typed()
    if (
      pending?.digits.length === 2 &&
      editableSegments()[pending.index]?.type === 'year'
    ) {
      setSegment('year', `${closestYear(pending.digits, local.referenceTime)}`)
    }
    setTyped(undefined)
  }

  const clearSegment = (segment: SegmentName) => {
    if (local.disabled || local.readonly) return
    setTyped(undefined)
    if (value()) setDraftDate(value()!.startOf('minute'))
    setCleared(previous => new Set(previous).add(segment))
    emitValue(undefined)
  }

  const selectSegment = (index: number, focus = false) => {
    if (local.disabled || local.readonly) return
    setAllSegmentsSelected(false)
    const next = Math.max(0, Math.min(index, editableSegments().length - 1))
    const pending = typed()
    if (pending?.index !== next) commitTypedYear()
    setSelected(next)
    setActiveItem(next)
    if (focus) segmentButtons[next]?.focus()
  }

  const selectControlItem = (index: number, focus = false) => {
    const segmentCount = editableSegments().length
    const next = Math.max(0, Math.min(index, segmentCount + actionButtons.length - 1))
    if (next < segmentCount) {
      selectSegment(next, focus)
      return
    }
    setTyped(undefined)
    setActiveItem(next)
    if (focus) actionButtons[next - segmentCount]?.focus()
  }

  const changeSegment = (segment: SegmentName, amount: number) => {
    if (local.disabled || local.readonly) return
    let date = (value() ?? draftDate()).startOf('minute')
    switch (segment) {
      case 'year':
        date = date.plus({ years: amount })
        break
      case 'month':
        date = date.plus({ months: amount })
        break
      case 'day':
        date = date.plus({ days: amount })
        break
      case 'hour':
        date = date.plus({ hours: amount })
        break
      case 'minute':
        date = date.plus({ minutes: amount })
        break
      case 'dayPeriod':
        date = date.plus({ hours: date.hour < 12 ? 12 : -12 })
        break
    }
    setDraftDate(date)
    if (cleared().size === 0) {
      emitValue(date)
      return
    }
    const nextCleared = new Set(cleared())
    nextCleared.delete(segment)
    setCleared(nextCleared)
    emitValue(hasClearedSegment(nextCleared) ? undefined : date)
  }

  const setDayPeriod = (morning: boolean) => {
    if (local.disabled || local.readonly) return
    const date = (value() ?? draftDate()).startOf('minute')
    if (date.hour < 12 !== morning) {
      changeSegment('dayPeriod', 1)
      return
    }
    if (!isCleared('dayPeriod')) return
    const nextCleared = new Set(cleared())
    nextCleared.delete('dayPeriod')
    setCleared(nextCleared)
    emitValue(hasClearedSegment(nextCleared) ? undefined : date)
  }

  const setSegment = (segment: SegmentName, digits: string) => {
    if (local.disabled || local.readonly || segment === 'dayPeriod') return
    const number = Number(digits)
    if (!Number.isFinite(number)) return
    let date = (value() ?? draftDate()).startOf('minute')
    let setDayPeriodToPm = false
    if (segment === 'year' && number >= 1) date = date.set({ year: number })
    if (segment === 'month' && number >= 1 && number <= 12) date = date.set({ month: number })
    if (segment === 'day' && number >= 1 && number <= 31) date = date.set({ day: number })
    if (segment === 'hour') {
      const hour12 = new Intl.DateTimeFormat(locale(), {
        hour: 'numeric',
        ...local.formatOptions,
      }).resolvedOptions().hour12
      if (hour12 && number >= 1 && number <= 12)
        date = date.set({ hour: (date.hour >= 12 ? 12 : 0) + (number % 12) })
      if (hour12 && number >= 13 && number <= 23) {
        date = date.set({ hour: number })
        setDayPeriodToPm = true
      }
      if (!hour12 && number >= 0 && number <= 23) date = date.set({ hour: number })
    }
    if (segment === 'minute' && number >= 0 && number <= 59) date = date.set({ minute: number })
    setDraftDate(date)
    if (cleared().size === 0) {
      emitValue(date)
      return
    }
    const nextCleared = new Set(cleared())
    nextCleared.delete(segment)
    if (setDayPeriodToPm) nextCleared.delete('dayPeriod')
    setCleared(nextCleared)
    emitValue(hasClearedSegment(nextCleared) ? undefined : date)
  }

  const openPicker = () => {
    if (local.disabled || local.readonly) return
    nativeInput?.showPicker()
  }

  const openNaturalInput = () => {
    if (local.disabled || local.readonly) return
    setNaturalText('')
    setNaturalSuggestion(0)
    setNaturalMode(true)
    if (hasOpenedNaturalInput) naturalPlaceholderAnimation.startNext()
    else naturalPlaceholderAnimation.start()
    hasOpenedNaturalInput = true
    queueMicrotask(() => naturalInput?.focus())
  }

  const exitNaturalInput = () => {
    naturalPlaceholderAnimation.stop()
    setNaturalText('')
    setNaturalSuggestion(0)
    setNaturalMode(false)
    queueMicrotask(() => selectSegment(0, true))
  }

  const confirmNaturalInput = () => {
    const date = naturalDate()
    if (!date || local.disabled || local.readonly) return
    setDraftDate(date)
    setCleared(new Set<SegmentName>())
    setTyped(undefined)
    emitValue(date)
    exitNaturalInput()
  }

  const closeNaturalInput = () => {
    exitNaturalInput()
  }

  const updateNaturalText = (next: string) => {
    const hadText = Boolean(naturalText())
    setNaturalText(next)
    setNaturalSuggestion(0)
    if (next) naturalPlaceholderAnimation.stop()
    else if (hadText) naturalPlaceholderAnimation.startNext()
  }

  onCleanup(naturalPlaceholderAnimation.stop)

  const acceptNaturalCompletion = () => {
    const completion = activeNaturalCompletion()
    if (!completion) return false
    updateNaturalText(completion.insertText)
    queueMicrotask(() => {
      naturalInput?.focus()
      naturalInput?.setSelectionRange(completion.insertText.length, completion.insertText.length)
    })
    return true
  }

  const cycleNaturalCompletion = (direction: 1 | -1) => {
    const completions = naturalCompletions()
    if (!completions.length) return
    setNaturalSuggestion(current => (current + direction + completions.length) % completions.length)
  }

  const updateFromNativeInput = (next: string) => {
    if (!next) {
      setCleared(new Set<SegmentName>(['year', 'month', 'day', 'hour', 'minute', 'dayPeriod']))
      setTyped(undefined)
      emitValue(undefined)
      return
    }
    const date = parseLocal(next, referenceZone())
    if (!date) return
    setDraftDate(date.startOf('minute'))
    emitValue(date)
    setCleared(new Set<SegmentName>())
    setTyped(undefined)
  }

  const pasteDateTime = (event: ClipboardEvent) => {
    if (naturalMode() || local.disabled || local.readonly) return
    const date = parseNaturalDate(event.clipboardData?.getData('text') ?? '', {
      referenceTime: local.referenceTime,
      zone: referenceZone(),
      locale: locale(),
    })
    if (!date) return
    event.preventDefault()
    setAllSegmentsSelected(false)
    setDraftDate(date)
    setCleared(new Set<SegmentName>())
    setTyped(undefined)
    emitValue(date)
  }

  const copyDateTime = (event: ClipboardEvent) => {
    if (naturalMode()) return
    const editor = event.currentTarget as HTMLSpanElement
    const value = editor.querySelector('.datetime-neo__value')
    if (!value) return
    event.clipboardData?.setData('text/plain', value.textContent ?? '')
    event.preventDefault()
  }

  const matchesFollowingSeparator = (index: number, key: string) => {
    if (key.length !== 1) return false
    let editableIndex = -1
    for (const part of segments()) {
      if (part.editable) {
        editableIndex += 1
        if (editableIndex > index) return false
        continue
      }
      if (editableIndex === index && part.value.includes(key)) return true
    }
    return false
  }

  const enterSegmentDigit = (index: number, segment: Segment, digit: string) => {
    const previous = typed()?.index === index ? typed()?.digits ?? '' : ''
    const digits = `${previous}${digit}`.slice(-digitLimit(segment.type))
    setTyped({ index, digits })
    setSegment(segment.type, digits)
    const hour12 =
      new Intl.DateTimeFormat(locale(), {
        hour: 'numeric',
        ...local.formatOptions,
      }).resolvedOptions().hour12 ?? false
    if (isCompleteSegment(segment.type, digits, hour12)) selectSegment(index + 1, true)
  }

  const onSegmentKeyDown = (event: KeyboardEvent, index: number, segment: Segment) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      setAllSegmentsSelected(true)
      return
    }
    if (!(event.ctrlKey || event.metaKey)) setAllSegmentsSelected(false)
    if (event.key === ' ') {
      event.preventDefault()
      openPicker()
      return
    }
    if (event.key === '@') {
      event.preventDefault()
      openNaturalInput()
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectControlItem(index - 1, true)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectControlItem(index + 1, true)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      changeSegment(segment.type, 1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      changeSegment(segment.type, -1)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      selectControlItem(0, true)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      selectControlItem(editableSegments().length + actionButtons.length - 1, true)
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      clearSegment(segment.type)
      return
    }
    if (segment.type !== 'dayPeriod' && event.key === '.') {
      event.preventDefault()
      selectSegment(index + 1, true)
      return
    }
    if (matchesFollowingSeparator(index, event.key)) {
      event.preventDefault()
      selectSegment(index + 1, true)
      return
    }
    if (segment.type === 'dayPeriod' && /^(a|p)$/i.test(event.key)) {
      event.preventDefault()
      setDayPeriod(event.key.toLowerCase() === 'a')
      return
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      enterSegmentDigit(index, segment, event.key)
    }
  }

  const onEmptyAreaClick = () => {
    if (naturalMode()) return
    if (!window.getSelection()?.isCollapsed) return
    selectSegment(0, true)
  }

  return (
    <span
      {...rest}
      class={`datetime-neo ${local.class ?? ''}`}
      classList={local.classList}
      data-actions={!local.readonly && !local.disabled ? '' : undefined}
      data-disabled={local.disabled ? '' : undefined}
      data-empty={value() ? undefined : ''}
      data-readonly={local.readonly ? '' : undefined}
    >
      <span
        class="datetime-neo__editor"
        role="group"
        aria-label={local['aria-label'] ?? 'Date and time'}
        aria-readonly={local.readonly || undefined}
        onCopy={copyDateTime}
        onPaste={pasteDateTime}
        onKeyDown={event => {
          if (naturalMode() || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'a')
            return
          event.preventDefault()
          setAllSegmentsSelected(true)
        }}
      >
        {naturalMode() ? (
          <>
            <span class="datetime-neo__natural-prefix" aria-hidden="true">
              @
            </span>
            <span class="datetime-neo__natural-field">
              <input
                ref={element => (naturalInput = element)}
                class="datetime-neo__natural-input"
                type="text"
                value={naturalText()}
                placeholder={naturalPlaceholder()}
                disabled={local.disabled}
                onInput={event => updateNaturalText(event.currentTarget.value)}
                onKeyDown={event => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    cycleNaturalCompletion(1)
                    return
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    cycleNaturalCompletion(-1)
                    return
                  }
                  if (
                    event.key === 'Tab' &&
                    !event.shiftKey &&
                    event.currentTarget.selectionStart === event.currentTarget.value.length &&
                    acceptNaturalCompletion()
                  ) {
                    event.preventDefault()
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirmNaturalInput()
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeNaturalInput()
                    return
                  }
                }}
              />
              {activeNaturalCompletion() && (
                <span class="datetime-neo__natural-ghost" aria-hidden="true">
                  <span class="datetime-neo__natural-ghost-typed">{naturalText()}</span>
                  {activeNaturalCompletion()!.insertText.slice(naturalText().length)}
                  <kbd>Tab</kbd>
                </span>
              )}
            </span>
            <span class="datetime-neo__natural-preview" aria-live="polite">
              {naturalDate()
                ? naturalPreview(naturalDate()!, locale(), local.formatOptions)
                : ''}
            </span>
          </>
        ) : (
          <span class="datetime-neo__value">
            <Index each={segments()}>
              {part =>
                part().editable ? (
                  (() => {
                    const segment = () => part() as Segment
                    const index = () =>
                      editableSegments().findIndex(candidate => candidate.type === segment().type)
                    return (
                      <span
                        ref={element => (segmentButtons[index()] = element)}
                        class="datetime-neo__segment"
                        classList={{
                          'datetime-neo__segment--selected': selected() === index(),
                          'datetime-neo__segment--all-selected': allSegmentsSelected(),
                        }}
                        role="spinbutton"
                        contenteditable={!local.disabled && !local.readonly ? true : undefined}
                        spellcheck={false}
                        inputmode={segment().type === 'dayPeriod' ? 'text' : 'decimal'}
                        tabindex={
                          local.disabled || local.readonly
                            ? undefined
                            : activeItem() === index()
                            ? 0
                            : -1
                        }
                        aria-disabled={local.disabled || undefined}
                        aria-label={part().type}
                        aria-selected={selected() === index()}
                        onFocus={() => selectSegment(index())}
                        onBlur={commitTypedYear}
                        onClick={() => selectSegment(index())}
                        onKeyDown={event => onSegmentKeyDown(event, index(), segment())}
                        onInput={event => {
                          const input = event.currentTarget
                          const lastCharacter = input.textContent?.at(-1)
                          input.textContent = isCleared(segment().type) ? '' : segment().value
                          if (segment().type !== 'dayPeriod' && lastCharacter === '.') {
                            selectSegment(index() + 1, true)
                            return
                          }
                          if (/^\d$/.test(lastCharacter ?? ''))
                            enterSegmentDigit(index(), segment(), lastCharacter!)
                        }}
                      >
                        {isCleared(segment().type) ? (
                          <span class="datetime-neo__placeholder">
                            {placeholderFor(segment().type)}
                          </span>
                        ) : (
                          displaySegmentValue(index(), segment())
                        )}
                      </span>
                    )
                  })()
                ) : (
                  <span class="datetime-neo__separator" aria-hidden="true">
                    {part().value}
                  </span>
                )
              }
            </Index>
          </span>
        )}
        {!naturalMode() && (
          <span class="datetime-neo__empty-area" aria-hidden="true" onClick={onEmptyAreaClick} />
        )}
        {local.showTimeOffset && (
          <span
            class="datetime-neo__timezone"
            aria-hidden="true"
            style={{ '--datetime-neo-actions-offset': `${actionSize.width ?? 0}px` }}
          >
            {timeOffset(
              naturalMode()
                ? naturalDate() ?? local.referenceTime
                : cleared().size
                ? draftDate()
                : value() ?? draftDate(),
            )}
          </span>
        )}
      </span>
      {!local.readonly && !local.disabled && (
        <span ref={setActions} class="datetime-neo__actions">
          <button
            ref={element => (actionButtons[0] = element)}
            class="datetime-neo__trigger"
            type="button"
            tabindex={activeItem() === editableSegments().length ? 0 : -1}
            disabled={local.disabled}
            aria-label={
              naturalMode()
                ? naturalDate()
                  ? 'Confirm natural-language date'
                  : 'Cancel natural-language date'
                : 'Enter date and time naturally'
            }
            onFocus={() => setActiveItem(editableSegments().length)}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                selectControlItem(editableSegments().length - 1, true)
                return
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                selectControlItem(editableSegments().length + 1, true)
                return
              }
              if (event.key === 'Home') {
                event.preventDefault()
                selectControlItem(0, true)
                return
              }
              if (event.key === 'End') {
                event.preventDefault()
                selectControlItem(editableSegments().length + actionButtons.length - 1, true)
              }
            }}
            onClick={() =>
              naturalMode()
                ? naturalDate()
                  ? confirmNaturalInput()
                  : closeNaturalInput()
                : openNaturalInput()
            }
          >
            {naturalMode() ? (
              naturalDate() ? (
                <ConfirmIcon />
              ) : (
                <CancelIcon />
              )
            ) : (
              local.magicIcon ?? <MagicIcon />
            )}
          </button>
          <label
            ref={element => (actionButtons[1] = element)}
            class="datetime-neo__trigger"
            for={nativeInputId}
            tabindex={activeItem() === editableSegments().length + 1 ? 0 : -1}
            aria-label="Open date and time picker"
            onFocus={() => setActiveItem(editableSegments().length + 1)}
            onClick={openPicker}
            onKeyDown={event => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault()
                openPicker()
                return
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                selectControlItem(editableSegments().length, true)
                return
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                selectControlItem(editableSegments().length + 2, true)
                return
              }
              if (event.key === 'Home') {
                event.preventDefault()
                selectControlItem(0, true)
                return
              }
              if (event.key === 'End') {
                event.preventDefault()
                selectControlItem(editableSegments().length + actionButtons.length - 1, true)
              }
            }}
          >
            {local.calendarIcon ?? <CalendarIcon />}
          </label>
        </span>
      )}
      <input
        ref={element => (nativeInput = element)}
        class="datetime-neo__native-input"
        id={nativeInputId}
        type="datetime-local"
        value={nativeValue()}
        disabled={local.disabled}
        readonly={local.readonly}
        tabindex={-1}
        onInput={event => updateFromNativeInput(event.currentTarget.value)}
        onChange={event => updateFromNativeInput(event.currentTarget.value)}
      />
    </span>
  )
}

export default Neodt
export { getNaturalDateCompletions } from './natural-completion'
export { parseNaturalDate } from './natural-parser'
