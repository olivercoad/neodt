import { createRoot, createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { DateTime } from 'luxon'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import Neodt from '../src'

const styles = readFileSync('src/styles.css', 'utf8')

const DateTimeLocal = Neodt

const referenceTime = DateTime.fromISO('2026-08-17T15:30:00Z')
const date = (value: string) => DateTime.fromISO(value, { zone: referenceTime.zoneName ?? 'utc' })
const localValue = (value: DateTime | null | undefined) =>
  value?.toFormat("yyyy-MM-dd'T'HH:mm") ?? ''

function key(element: HTMLElement, keyName: string) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }))
}

function paste(element: HTMLElement, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
  element.dispatchEvent(event)
}

function copy(element: HTMLElement) {
  let text = ''
  const event = new Event('copy', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { setData: (_type: string, value: string) => (text = value) },
  })
  element.dispatchEvent(event)
  return { prevented: event.defaultPrevented, text }
}

function nextRender() {
  return new Promise<void>(resolve => queueMicrotask(resolve))
}

describe('environment', () => {
  it('runs on client', () => {
    expect(typeof window).toBe('object')
    expect(isServer).toBe(false)
  })
})

describe('Neodt', () => {
  it('does not wrap when the widest idle locale value fits', async () => {
    const clientWidth = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo') ? 400 : 0
      })
    const scrollWidth = vi
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo__measurement') ? 300 : 0
      })
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)

    await nextRender()
    expect(control.dataset.wrapped).toBeUndefined()
    expect(
      control.querySelectorAll(
        ':scope > .datetime-neo__content > .datetime-neo__editor .datetime-neo__row',
      ),
    ).toHaveLength(2)
    const measurement = control.querySelector('.datetime-neo__measurement')!
    expect(measurement.querySelector(':scope > .datetime-neo__editor')).not.toBeNull()
    expect(measurement.querySelector(':scope > .datetime-neo__trailing')).not.toBeNull()
    expect(measurement.querySelector('.datetime-neo__editor .datetime-neo__value')).not.toBeNull()
    expect(measurement.querySelector('.datetime-neo__editor .datetime-neo__segment')).not.toBeNull()
    expect(
      measurement.querySelector('.datetime-neo__editor .datetime-neo__separator'),
    ).not.toBeNull()
    expect(
      measurement.querySelector('.datetime-neo__trailing .datetime-neo__actions'),
    ).not.toBeNull()
    expect(
      measurement.querySelectorAll('.datetime-neo__trailing .datetime-neo__trigger'),
    ).toHaveLength(2)
    expect(styles).toMatch(
      /:is\(\s*\.datetime-neo__content:not\(:hover\):not\(:focus-within\).*\.datetime-neo__editor,\s*\.datetime-neo:not\(\[data-time-offset\]\) \.datetime-neo__measurement > \.datetime-neo__editor/s,
    )
    expect(styles).toMatch(
      /:is\(\s*\.datetime-neo:not\(:hover\):not\(:focus-within\).*\.datetime-neo__actions,\s*\.datetime-neo__measurement \.datetime-neo__actions/s,
    )
    dispose!()
    clientWidth.mockRestore()
    scrollWidth.mockRestore()
  })

  it('locks a two-row layout from idle width across focus and natural entry', async () => {
    const clientWidth = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo') ? 120 : 0
      })
    const scrollWidth = vi
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo__measurement') ? 300 : 0
      })
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          showTimeOffset
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)

    await nextRender()
    expect(control.querySelector('.datetime-neo__content')?.dataset.wrapped).toBe('')
    const rows = control.querySelectorAll(
      ':scope > .datetime-neo__content > .datetime-neo__editor .datetime-neo__row',
    )
    expect(rows[0]?.textContent).toContain('17/08/2026')
    expect(rows[1]?.textContent).toContain('15:30')
    control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!.focus()
    await nextRender()
    expect(control.querySelector('.datetime-neo__content')?.dataset.wrapped).toBe('')
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    expect(control.querySelector('.datetime-neo__content')?.dataset.wrapped).toBe('')
    expect(control.querySelector('.datetime-neo__natural-entry')).not.toBeNull()
    expect(control.querySelector('.datetime-neo__natural-result')).not.toBeNull()
    expect(
      getComputedStyle(
        control.querySelector(
          '.datetime-neo__measurement > .datetime-neo__editor > .datetime-neo__value',
        )!,
      ).display,
    ).not.toBe('grid')
    control.remove()
    dispose!()
    clientWidth.mockRestore()
    scrollWidth.mockRestore()
  })

  it('keeps wrapped and natural rows intrinsically matched with consumer metrics', async () => {
    const clientWidth = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo') ? 120 : 0
      })
    const scrollWidth = vi
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('datetime-neo__measurement') ? 300 : 0
      })
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          class="consumer-metrics"
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)

    await nextRender()
    expect(control.querySelector('.datetime-neo__content')?.dataset.wrapped).toBe('')
    expect(control.classList).toContain('consumer-metrics')

    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()

    expect(control.querySelector('.datetime-neo__natural-input')).not.toBeNull()
    expect(control.querySelector('.datetime-neo__natural-preview')).not.toBeNull()
    expect(styles).not.toMatch(/\.datetime-neo(?:\[data-wrapped\])?\s*\{[^}]*min-height/)
    expect(styles).toMatch(/grid-template-rows:\s*auto auto/g)
    expect(styles).toMatch(
      /\.datetime-neo__segment\s*\{[^}]*line-height:\s*var\(--datetime-neo-segment-line-height\)[^}]*padding:\s*var\(--datetime-neo-segment-padding\)/s,
    )
    expect(styles).toMatch(
      /\.datetime-neo__natural-input\s*\{[^}]*line-height:\s*var\(--datetime-neo-segment-line-height\)[^}]*padding:\s*var\(--datetime-neo-segment-padding\)/s,
    )
    expect(styles).toMatch(
      /\.datetime-neo__natural-preview\s*\{[^}]*line-height:\s*var\(--datetime-neo-segment-line-height\)[^}]*padding:\s*var\(--datetime-neo-segment-padding\)/s,
    )

    control.remove()
    dispose!()
    clientWidth.mockRestore()
    scrollWidth.mockRestore()
  })

  it('uses the system locale when locale is omitted', () =>
    createRoot(() => {
      const value = date('2026-08-17T15:30')
      const control = (
        <DateTimeLocal referenceTime={referenceTime} value={value} />
      ) as HTMLSpanElement
      const expected = value
        .setLocale(new Intl.DateTimeFormat().resolvedOptions().locale)
        .toLocaleParts({
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        })
        .map(part => part.value)
        .join('')

      expect(control.querySelector('.datetime-neo__value')?.textContent).toBe(expected)
    }))

  it('renders locale-ordered editable segments with a hidden native input and picker button', () =>
    createRoot(() => {
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
      expect(control.querySelectorAll('.datetime-neo__segment')[0]?.textContent).toBe('17')
      expect(control.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value).toBe(
        '2026-08-17T15:30',
      )
      expect(control.querySelector('.datetime-neo__trigger')).not.toBeNull()
    }))

  it('formats years with fewer than four digits using leading zeros', () =>
    createRoot(() => {
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('0001-08-17T15:30')}
        />
      ) as HTMLSpanElement
      expect(control.querySelector<HTMLButtonElement>('[aria-label="year"]')?.textContent).toBe(
        '0001',
      )
    }))

  it('groups copyable date text and excludes action icons from selection', () =>
    createRoot(() => {
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
      const value = control.querySelector('.datetime-neo__value')!
      expect(value.textContent).toBe('17/08/2026, 15:30')
      expect(value.textContent).not.toContain('@')
    }))

  it('copies ISO date text unless all segments are selected', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)
    const editor = control.querySelector<HTMLSpanElement>('.datetime-neo__editor')!
    const segments = editor.querySelectorAll('.datetime-neo__segment')
    const expected = '17/08/2026, 15:30'
    const isoDate = date('2026-08-17T15:30').toISO({ precision: 'minutes' })
    const normalCopy = copy(control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!)
    expect(normalCopy.prevented).toBe(true)
    expect(normalCopy.text).toBe(isoDate)
    key(control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!, 'a')
    expect(window.getSelection()?.toString()).not.toBe(editor.textContent)
    control
      .querySelector<HTMLButtonElement>('.datetime-neo__segment')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    await nextRender()
    expect(window.getSelection()?.toString()).not.toBe(expected)
    expect(
      Array.from(segments).every(segment =>
        segment.classList.contains('datetime-neo__segment--all-selected'),
      ),
    ).toBe(true)
    expect(editor.querySelector('.datetime-neo__timezone')).toBeNull()
    const result = copy(control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!)
    expect(result.prevented).toBe(true)
    expect(result.text).toBe(expected)
    control.remove()
    dispose!()
  })

  it('uses the reference timezone for editing and hides its offset by default', () =>
    createRoot(() => {
      const sydneyReference = DateTime.fromISO('2026-08-17T15:30:00', { zone: 'Australia/Sydney' })
      const control = (
        <DateTimeLocal
          referenceTime={sydneyReference}
          locale="en-GB"
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
      expect(control.querySelector('.datetime-neo__segment')?.textContent).toBe('17')
      expect(control.querySelector('.datetime-neo__timezone')).toBeNull()
    }))

  it('shows the selected offset including zero minutes when showTimeOffset is enabled', () =>
    createRoot(() => {
      const sydneyReference = DateTime.fromISO('2026-08-17T15:30:00', { zone: 'Australia/Sydney' })
      const control = (
        <DateTimeLocal
          referenceTime={sydneyReference}
          locale="en-GB"
          showTimeOffset
          value={date('2026-08-17T15:30')}
        />
      ) as HTMLSpanElement
      const timezone = control.querySelector('.datetime-neo__timezone')
      expect(timezone?.textContent).toBe('+10:00')
      expect(
        timezone?.querySelector('.datetime-neo__timezone-minutes[data-zero]')?.textContent,
      ).toBe(':00')
      expect(timezone?.parentElement?.classList.contains('datetime-neo__trailing')).toBe(true)
      expect(timezone?.parentElement?.querySelector('.datetime-neo__actions')).not.toBeNull()
    }))

  it('rounds offsets to minutes and keeps minutes in measurement layouts', () =>
    createRoot(() => {
      const fourHourReference = DateTime.fromISO('2026-08-17T15:30:00', { zone: 'UTC+4' })
      const fourHourControl = (
        <DateTimeLocal
          referenceTime={fourHourReference}
          locale="en-GB"
          showTimeOffset
          value={fourHourReference}
        />
      ) as HTMLSpanElement
      expect(fourHourControl.querySelector('.datetime-neo__timezone')?.textContent).toBe('+4:00')
      expect(
        fourHourControl.querySelector('.datetime-neo__measurement .datetime-neo__timezone')
          ?.textContent,
      ).toBe('+4:00')

      const halfHourReference = DateTime.fromISO('2026-08-17T15:30:00', { zone: 'UTC+10:30' })
      const halfHourControl = (
        <DateTimeLocal
          referenceTime={halfHourReference}
          locale="en-GB"
          showTimeOffset
          value={halfHourReference}
        />
      ) as HTMLSpanElement
      expect(halfHourControl.querySelector('.datetime-neo__timezone')?.textContent).toBe('+10:30')
      expect(
        halfHourControl.querySelector('.datetime-neo__measurement .datetime-neo__timezone')
          ?.textContent,
      ).toBe('+10:30')
      expect(styles).toMatch(
        /\.datetime-neo:is\(:hover, :focus-within\) \.datetime-neo__content:not\(\[data-wrapped\]\) \.datetime-neo__timezone-minutes\[data-zero\]/,
      )
      expect(styles).toMatch(
        /\.datetime-neo:not\(:hover\):not\(:focus-within\) \.datetime-neo__content\[data-wrapped\] \.datetime-neo__timezone-minutes\[data-zero\]/,
      )
      expect(styles).toMatch(/clip-path 220ms ease/)
      expect(styles).toMatch(/margin-right 220ms ease/)
      expect(styles).toMatch(/opacity 220ms ease/)
      expect(styles).toMatch(/clip-path: inset\(0 100% 0 0\)/)
      expect(styles).toMatch(/transition-delay: 150ms/)
    }))

  it('associates the picker label with the native input and opens it from Space', () =>
    createRoot(dispose => {
      const showPicker = vi.fn()
      const nativeClick = vi.fn()
      const control = (
        <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
      ) as HTMLSpanElement
      const input = control.querySelector<HTMLInputElement>('input')!
      const trigger = control.querySelector<HTMLLabelElement>(
        '[aria-label="Open date and time picker"]',
      )!
      Object.defineProperty(input, 'showPicker', { value: showPicker })
      input.addEventListener('click', nativeClick)
      document.body.append(control)
      trigger.click()
      key(control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!, ' ')
      expect(trigger.htmlFor).toBe(input.id)
      expect(input.getAttribute('aria-hidden')).toBeNull()
      expect(nativeClick).toHaveBeenCalledTimes(1)
      expect(showPicker).toHaveBeenCalledTimes(2)
      control.remove()
      dispose()
    }))

  it('uses a custom calendar icon and updates from native input changes', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          calendarIcon={<span>Choose</span>}
          onValueChange={onValueChange}
        />
      ) as HTMLSpanElement
      const input = control.querySelector<HTMLInputElement>('input')!
      document.body.append(control)
      expect(control.querySelector('[aria-label="Open date and time picker"]')?.textContent).toBe(
        'Choose',
      )
      input.value = '2026-09-01T08:45'
      input.dispatchEvent(new InputEvent('input', { bubbles: true }))
      expect(localValue(onValueChange.mock.calls[0]?.[0])).toBe('2026-09-01T08:45')
      control.remove()
      dispose()
    }))

  it('pastes common datetime formats and the current display format', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          formatOptions={{ hour12: false }}
          defaultValue={date('2026-09-04T11:20')}
          onValueChange={onValueChange}
        />
      ) as HTMLSpanElement
      document.body.append(control)
      const segment = control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!
      const configuredFormat = Array.from(control.querySelector('.datetime-neo__editor')!.children)
        .filter(element => !element.classList.contains('datetime-neo__timezone'))
        .map(element => element.textContent)
        .join('')
      const cases: Array<[string, string]> = [
        ['2026-09-01T08:45', '2026-09-01T08:45'],
        ['September 2, 2026 at 9:30 AM', '2026-09-02T09:30'],
        ['03/09/2026 10:15', '2026-09-03T10:15'],
        [configuredFormat, '2026-09-04T11:20'],
      ]
      for (const [text, expected] of cases) {
        paste(segment, text)
        expect(localValue(onValueChange.mock.calls.at(-1)?.[0])).toBe(expected)
      }
      control.remove()
      dispose()
    }))

  it('parses and confirms a natural-language date from the magic input', async () => {
    let dispose: (() => void) | undefined
    const onValueChange = vi.fn()
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-GB"
          formatOptions={{ hour12: false }}
          magicIcon={<span>Magic</span>}
          onValueChange={onValueChange}
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)
    const magicButton = control.querySelector<HTMLButtonElement>(
      ':scope > .datetime-neo__content > .datetime-neo__trailing [aria-label="Enter date and time naturally"]',
    )!
    expect(magicButton.textContent).toBe('Magic')
    magicButton.click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    expect(input.placeholder).toHaveLength(1)
    expect(control.querySelector('[aria-label="Cancel natural-language date"]')).not.toBeNull()
    expect(control.querySelector('[aria-label="Open date and time picker"]')).toBeNull()
    input.value = 'August 18, 2026 at 9am'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-preview')?.textContent).toBe(
      '18/08/2026, 09:00',
    )
    control
      .querySelector<HTMLButtonElement>('[aria-label="Confirm natural-language date"]')!
      .click()
    await nextRender()
    expect(localValue(onValueChange.mock.calls[0]?.[0])).toBe('2026-08-18T09:00')
    expect(control.querySelector('.datetime-neo__natural-input')).toBeNull()
    expect(document.activeElement).toBe(control.querySelector('.datetime-neo__segment'))
    control.remove()
    dispose!()
  })

  it('advances the placeholder example when natural entry is reopened', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    const magicButton = control.querySelector<HTMLButtonElement>(
      '[aria-label="Enter date and time naturally"]',
    )!

    magicButton.click()
    await nextRender()
    expect(
      control.querySelector<HTMLInputElement>(
        ':scope > .datetime-neo__content > .datetime-neo__editor .datetime-neo__natural-input',
      )?.placeholder,
    ).toBe('n')
    control
      .querySelector<HTMLButtonElement>(
        ':scope > .datetime-neo__content > .datetime-neo__trailing [aria-label="Cancel natural-language date"]',
      )!
      .click()
    control
      .querySelector<HTMLButtonElement>(
        ':scope > .datetime-neo__content > .datetime-neo__trailing [aria-label="Enter date and time naturally"]',
      )!
      .click()
    await nextRender()
    expect(
      control.querySelector<HTMLInputElement>(
        ':scope > .datetime-neo__content > .datetime-neo__editor .datetime-neo__natural-input',
      )?.placeholder,
    ).toBe('t')

    control.remove()
    dispose!()
  })

  it('opens natural-language entry with the @ key', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    const segment = control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!
    expect(control.querySelector('[aria-label="Enter date and time naturally"]')?.textContent).toBe(
      '@',
    )
    const event = new KeyboardEvent('keydown', { key: '@', bubbles: true, cancelable: true })
    segment.dispatchEvent(event)
    await nextRender()
    expect(event.defaultPrevented).toBe(true)
    expect(control.querySelector('.datetime-neo__natural-input')).not.toBeNull()
    expect(control.querySelector('.datetime-neo__natural-prefix')?.textContent).toBe('@')
    expect(document.activeElement).toBe(control.querySelector('.datetime-neo__natural-input'))
    control.remove()
    dispose!()
  })

  it('shows the parsed date offset in natural-language mode', async () => {
    let dispose: (() => void) | undefined
    const sydneyReference = DateTime.fromISO('2026-08-17T15:30:00', { zone: 'Australia/Sydney' })
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={sydneyReference} showTimeOffset />) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    input.value = 'January 1, 2027 at 9am'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__timezone')?.textContent).toBe('+11:00')
    control.remove()
    dispose!()
  })

  it('renders the magic-mode offset only once when format options include a timezone name', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (
        <DateTimeLocal
          referenceTime={referenceTime}
          formatOptions={{ timeZoneName: 'shortOffset' }}
          showTimeOffset
        />
      ) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    input.value = 'August 18, 2026 at 9am'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-preview')?.textContent).not.toContain(
      'GMT',
    )
    expect(
      control.querySelectorAll(
        ':scope > .datetime-neo__content > .datetime-neo__trailing > .datetime-neo__timezone',
      ),
    ).toHaveLength(1)
    control.remove()
    dispose!()
  })

  it('cancels natural-language entry when no date can be parsed', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!.value = 'not a date'
    control
      .querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
      .dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    control.querySelector<HTMLButtonElement>('[aria-label="Cancel natural-language date"]')!.click()
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-input')).toBeNull()
    expect(document.activeElement).toBe(control.querySelector('.datetime-neo__segment'))
    control.remove()
    dispose!()
  })

  it('accepts the active natural-language completion with Tab', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    input.value = 'tom'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-ghost')?.textContent).toContain('orrow')
    key(input, 'Tab')
    await nextRender()
    expect(input.value).toBe('tomorrow')
    expect(document.activeElement).toBe(input)
    control.remove()
    dispose!()
  })

  it('cycles natural completions and leaves focus traversal to Shift+Tab', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    input.value = 'next '
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-ghost')?.textContent).toContain('monday')
    key(input, 'ArrowDown')
    expect(control.querySelector('.datetime-neo__natural-ghost')?.textContent).toContain('tuesday')
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(input.value).toBe('next ')
    control.remove()
    dispose!()
  })

  it('exits natural-language entry with Escape even when a completion is active', async () => {
    let dispose: (() => void) | undefined
    const control = createRoot(rootDispose => {
      dispose = rootDispose
      return (<DateTimeLocal referenceTime={referenceTime} />) as HTMLSpanElement
    })
    document.body.append(control)
    control
      .querySelector<HTMLButtonElement>('[aria-label="Enter date and time naturally"]')!
      .click()
    await nextRender()
    const input = control.querySelector<HTMLInputElement>('.datetime-neo__natural-input')!
    input.value = 'fri'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-ghost')).not.toBeNull()
    key(input, 'Escape')
    await nextRender()
    expect(control.querySelector('.datetime-neo__natural-input')).toBeNull()
    expect(control.querySelector('[aria-label="Enter date and time naturally"]')).not.toBeNull()
    control.remove()
    dispose!()
  })

  it('restores cleared segments from a native picker change event', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          value={date('2026-08-17T15:30')}
          onValueChange={onValueChange}
        />
      ) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
      key(year, 'Backspace')
      const input = control.querySelector<HTMLInputElement>('input')!
      expect(input.value).toBe('2026-08-17T15:30')
      input.value = '2026-09-01T08:45'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      expect(localValue(onValueChange.mock.calls.at(-1)?.[0])).toBe('2026-09-01T08:45')
      expect(control.querySelector<HTMLButtonElement>('[aria-label="year"]')?.textContent).toBe(
        '2026',
      )
      control.remove()
      dispose()
    }))

  it('clears every segment when the native picker is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const onValueChange = vi.fn()
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            value={date('2026-08-17T15:30')}
            onValueChange={onValueChange}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const input = control.querySelector<HTMLInputElement>('input')!
        input.value = ''
        input.dispatchEvent(new Event('change', { bubbles: true }))
        expect(onValueChange).toHaveBeenCalledWith(null)
        nextRender().then(() => {
          expect(control.querySelectorAll('.datetime-neo__placeholder')).toHaveLength(6)
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('uses the locale default width for hours and minutes', () =>
    createRoot(() => {
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-US"
          value={date('2026-08-17T05:03')}
        />
      ) as HTMLSpanElement
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
      expect(segments[3]?.textContent).toBe('5')
      expect(segments[4]?.textContent).toBe('03')
    }))

  it('renders every segment as a placeholder for an initially empty value', () =>
    createRoot(() => {
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          locale="en-US"
          formatOptions={{ hour12: true }}
          value={null}
        />
      ) as HTMLSpanElement
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
      expect(segments[5]?.textContent).toBe('--')
      expect(control.querySelectorAll('.datetime-neo__placeholder')).toHaveLength(6)
      expect(control.hasAttribute('data-empty')).toBe(true)
    }))

  it('sets the draft day period directly with a and p keys', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            value={null}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () =>
          control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')!
        key(dayPeriod(), 'p')
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('PM')
          key(dayPeriod(), 'p')
          expect(dayPeriod().textContent).toBe('PM')
          key(dayPeriod(), 'a')
          nextRender().then(() => {
            expect(dayPeriod().textContent).toBe('AM')
            key(dayPeriod(), 'a')
            expect(dayPeriod().textContent).toBe('AM')
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('sets day periods from contenteditable input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            defaultValue={date('2026-08-17T15:30')}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () => control.querySelector<HTMLSpanElement>('[aria-label="dayPeriod"]')!
        dayPeriod().textContent = 'PMa'
        dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'a' }))
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('AM')
          dayPeriod().textContent = 'AMp'
          dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'p' }))
          nextRender().then(() => {
            expect(dayPeriod().textContent).toBe('PM')
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('fills a cleared day period from contenteditable input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            value={null}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () => control.querySelector<HTMLSpanElement>('[aria-label="dayPeriod"]')!
        dayPeriod().textContent = 'p'
        dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'p' }))
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('PM')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('sets Japanese day periods from localized contenteditable input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="ja-JP"
            formatOptions={{ hour12: true }}
            defaultValue={date('2026-08-17T15:30')}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () => control.querySelector<HTMLSpanElement>('[aria-label="dayPeriod"]')!
        expect(dayPeriod().textContent).toBe('午後')
        dayPeriod().textContent = '午後午前'
        dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: '午前' }))
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('午前')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('accepts A/P day-period aliases in every locale', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="ja-JP"
            formatOptions={{ hour12: true }}
            defaultValue={date('2026-08-17T15:30')}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () => control.querySelector<HTMLSpanElement>('[aria-label="dayPeriod"]')!
        key(dayPeriod(), 'a')
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('午前')
          dayPeriod().textContent = '午前p'
          dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'p' }))
          nextRender().then(() => {
            expect(dayPeriod().textContent).toBe('午後')
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('restores a cleared day-period placeholder after unhandled input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            value={null}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const dayPeriod = () => control.querySelector<HTMLSpanElement>('[aria-label="dayPeriod"]')!
        dayPeriod().textContent = 'x'
        dayPeriod().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x' }))
        nextRender().then(() => {
          expect(dayPeriod().textContent).toBe('--')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('selects focused segments and moves focus with left and right arrows', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLButtonElement>(
          '.datetime-neo__editor[role="group"] .datetime-neo__segment',
        )
        segments[1]?.focus()
        nextRender().then(() => {
          expect(segments[1]?.getAttribute('aria-selected')).toBe('true')
          key(segments[1]!, 'ArrowRight')
          nextRender().then(() => {
            expect(document.activeElement).toBe(segments[2])
            expect(segments[2]?.getAttribute('aria-selected')).toBe('true')
            key(segments[2]!, 'ArrowLeft')
            nextRender().then(() => {
              expect(document.activeElement).toBe(segments[1])
              control.remove()
              dispose()
              resolve()
            })
          })
        })
      }),
    ))

  it('does not create a native text selection when a segment receives focus', () =>
    createRoot(dispose => {
      const control = (
        <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
      ) as HTMLSpanElement
      document.body.append(control)
      const segment = control.querySelector<HTMLElement>('.datetime-neo__segment')!
      window.getSelection()?.removeAllRanges()
      segment.focus()
      expect(window.getSelection()?.rangeCount).toBe(0)
      control.remove()
      dispose()
    }))

  it('uses one tab stop and moves between segments and actions with arrow keys', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLButtonElement>(
          '.datetime-neo__editor[role="group"] .datetime-neo__segment',
        )
        const actions = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__trigger')
        expect(control.querySelectorAll<HTMLElement>('[tabindex="0"]')).toHaveLength(1)
        expect(segments[0]?.tabIndex).toBe(0)
        expect(segments[1]?.tabIndex).toBe(-1)
        expect(actions[0]?.tabIndex).toBe(-1)
        expect(actions[1]?.tabIndex).toBe(-1)
        segments[segments.length - 1]!.focus()
        key(segments[segments.length - 1]!, 'ArrowRight')
        nextRender().then(() => {
          expect(document.activeElement).toBe(actions[0])
          expect(control.querySelectorAll<HTMLButtonElement>('button[tabindex="0"]')).toHaveLength(
            1,
          )
          key(actions[0]!, 'ArrowRight')
          nextRender().then(() => {
            expect(document.activeElement).toBe(actions[1])
            key(actions[1]!, 'ArrowLeft')
            nextRender().then(() => {
              expect(document.activeElement).toBe(actions[0])
              key(actions[0]!, 'ArrowLeft')
              nextRender().then(() => {
                expect(document.activeElement).toBe(segments[segments.length - 1])
                control.remove()
                dispose()
                resolve()
              })
            })
          })
        })
      }),
    ))

  it('advances when a following static separator key is pressed', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-GB"
            value={date('2026-08-17T15:30')}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLButtonElement>(
          '.datetime-neo__editor[role="group"] .datetime-neo__segment',
        )
        segments[0]!.focus()
        key(segments[0]!, '/')
        nextRender().then(() => {
          expect(document.activeElement).toBe(segments[1])
          key(segments[1]!, '/')
          nextRender().then(() => {
            expect(document.activeElement).toBe(segments[2])
            key(segments[2]!, ',')
            nextRender().then(() => {
              expect(document.activeElement).toBe(segments[3])
              key(segments[3]!, ':')
              nextRender().then(() => {
                expect(document.activeElement).toBe(segments[4])
                control.remove()
                dispose()
                resolve()
              })
            })
          })
        })
      }),
    ))

  it('uses the decimal keyboard for numeric segments and advances on decimal input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLSpanElement>('.datetime-neo__segment')
        expect(segments[0]?.getAttribute('inputmode')).toBe('decimal')
        segments[0]!.focus()
        segments[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, data: '.' }))
        nextRender().then(() => {
          expect(document.activeElement).toBe(segments[1])
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('does not re-enter a segment digit for unhandled contenteditable input', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLSpanElement>('.datetime-neo__segment')
        const originalValue = segments[0]!.textContent
        segments[0]!.focus()
        segments[0]!.textContent = `${originalValue}x`
        segments[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x' }))
        nextRender().then(() => {
          expect(segments[0]?.textContent).toBe(originalValue)
          expect(document.activeElement).toBe(segments[0])
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('focuses the first segment when the empty editor area is clicked', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const emptyArea = control.querySelector<HTMLSpanElement>('.datetime-neo__empty-area')!
        const firstSegment = control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!
        const segments = control.querySelectorAll<HTMLButtonElement>(
          '.datetime-neo__editor[role="group"] .datetime-neo__segment',
        )
        segments[segments.length - 1]!.focus()
        const event = new MouseEvent('click', { bubbles: true, cancelable: true })
        emptyArea.dispatchEvent(event)
        nextRender().then(() => {
          expect(event.defaultPrevented).toBe(false)
          expect(document.activeElement).toBe(firstSegment)
          expect(firstSegment.getAttribute('aria-selected')).toBe('true')
          expect(segments[segments.length - 1]?.getAttribute('aria-selected')).toBe('false')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('preserves a selection dragged from the empty editor area', () =>
    createRoot(dispose => {
      const control = (
        <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
      ) as HTMLSpanElement
      document.body.append(control)
      const emptyArea = control.querySelector<HTMLSpanElement>('.datetime-neo__empty-area')!
      const value = control.querySelector<HTMLSpanElement>('.datetime-neo__value')!
      const firstSegment = control.querySelector<HTMLElement>('.datetime-neo__segment')!
      const range = document.createRange()
      range.selectNodeContents(value)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      emptyArea.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(selection.toString()).toBe(value.textContent)
      expect(document.activeElement).not.toBe(firstSegment)
      control.remove()
      dispose()
    }))

  it('increments and decrements the selected locale segment', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (
        <DateTimeLocal
          referenceTime={referenceTime}
          value={date('2026-08-17T15:30')}
          onValueChange={onValueChange}
        />
      ) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, 'ArrowUp')
      key(month, 'ArrowDown')
      expect(localValue(onValueChange.mock.calls[0]?.[0])).toBe('2026-09-17T15:30')
      expect(localValue(onValueChange.mock.calls[1]?.[0])).toBe('2026-07-17T15:30')
      control.remove()
      dispose()
    }))

  it('keeps focus while repeatedly adjusting a segment', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        month.focus()
        key(month, 'ArrowUp')
        nextRender().then(() => {
          const updatedMonth =
            control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
          expect(updatedMonth).toBe(month)
          expect(document.activeElement).toBe(updatedMonth)
          key(updatedMonth, 'ArrowUp')
          nextRender().then(() => {
            expect(localValue(value())).toBe('2026-10-17T15:30')
            expect(control.querySelectorAll('.datetime-neo__segment')[0]).toBe(month)
            expect(document.activeElement).toBe(month)
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('accepts numeric entry and advances after a complete segment', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        month.focus()
        key(month, '1')
        key(month, '2')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-12-17T15:30')
          nextRender().then(() => {
            expect(document.activeElement).toBe(
              control.querySelectorAll('.datetime-neo__segment')[1],
            )
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('updates the displayed year after controlled numeric entry', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
        year.focus()
        key(year, '2')
        key(year, '0')
        key(year, '1')
        key(year, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2015-08-17T15:30')
          expect(year.textContent).toBe('2015')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('keeps draft segment values visible while the external value is incomplete', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(null)
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
        year.focus()
        key(year, '2')
        key(year, '0')
        key(year, '1')
        key(year, '5')
        key(year, 'ArrowUp')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(year.textContent).toBe('2016')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('preserves leading zero entry until the segment is complete', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        month.focus()
        key(month, '0')
        expect(document.activeElement).toBe(month)
        key(month, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-05-17T15:30')
          expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[1])
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('preserves a leading zero while entering an hour', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            value={value()}
            onValueChange={setValue}
            locale="en-US"
            formatOptions={{ hour12: true }}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const hour = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[3]!
        hour.focus()
        key(hour, '0')
        expect(document.activeElement).toBe(hour)
        key(hour, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-08-17T17:30')
          expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[4])
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('sets PM when a 12-hour entry exceeds 12', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T05:30'))
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            value={value()}
            onValueChange={setValue}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
        key(hour, '1')
        key(hour, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-08-17T15:30')
          expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe(
            '3',
          )
          expect(
            control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')?.textContent,
          ).toBe('PM')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('keeps a 24-hour entry unchanged when it exceeds 12', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T05:30'))
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-AU"
            formatOptions={{ hourCycle: 'h23' }}
            value={value()}
            onValueChange={setValue}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
        key(hour, '1')
        key(hour, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-08-17T15:30')
          expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe(
            '15',
          )
          expect(control.querySelector('[aria-label="dayPeriod"]')).toBeNull()
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('sets the draft day period to PM when the year is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-08-17T05:30'))
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-US"
            formatOptions={{ hour12: true }}
            value={value()}
            onValueChange={setValue}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
        key(year, 'Backspace')
        const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
        key(hour, '1')
        key(hour, '5')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(control.querySelector<HTMLButtonElement>('[aria-label="year"]')?.textContent).toBe(
            'yyyy',
          )
          expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe(
            '3',
          )
          expect(
            control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')?.textContent,
          ).toBe('PM')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('allows day 31 when the month is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-02-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelector<HTMLButtonElement>('[aria-label="month"]')!
        const day = control.querySelector<HTMLButtonElement>('[aria-label="day"]')!
        key(month, 'Backspace')
        key(day, '3')
        key(day, '1')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(month.textContent).toBe('mm')
          expect(day.textContent).toBe('31')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('increments a cleared-month day to 31 instead of rolling into the next month', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-04-30T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelector<HTMLButtonElement>('[aria-label="month"]')!
        const day = control.querySelector<HTMLButtonElement>('[aria-label="day"]')!
        key(month, 'Backspace')
        key(day, 'ArrowUp')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(month.textContent).toBe('mm')
          expect(day.textContent).toBe('31')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('allows February 29 when the year is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-02-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
        const day = control.querySelector<HTMLButtonElement>('[aria-label="day"]')!
        key(year, 'Backspace')
        key(day, '2')
        key(day, '9')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(year.textContent).toBe('yyyy')
          expect(day.textContent).toBe('29')
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('rolls February 29 to March 1 and rejects February 30 when the year is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-02-28T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
        const month = control.querySelector<HTMLButtonElement>('[aria-label="month"]')!
        const day = control.querySelector<HTMLButtonElement>('[aria-label="day"]')!
        key(year, 'Backspace')
        key(day, 'ArrowUp')
        nextRender().then(() => {
          expect(day.textContent).toBe('29')
          key(day, 'ArrowUp')
          nextRender().then(() => {
            expect(month.textContent).toBe('3')
            expect(day.textContent).toBe('1')
            key(month, '2')
            key(day, '3')
            key(day, '0')
            nextRender().then(() => {
              expect(value()).toBeNull()
              expect(month.textContent).toBe('2')
              expect(day.textContent).toBe('3')
              control.remove()
              dispose()
              resolve()
            })
          })
        })
      }),
    ))

  it('uses the nearest leap year for February day navigation when the year is cleared', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2025-02-28T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
        const day = control.querySelector<HTMLButtonElement>('[aria-label="day"]')!
        key(year, 'Backspace')
        key(day, 'ArrowUp')
        nextRender().then(() => {
          expect(day.textContent).toBe('29')
          expect(
            control.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value,
          ).toBe('2024-02-29T15:30')
          key(day, 'ArrowUp')
          nextRender().then(() => {
            key(day, 'ArrowDown')
            nextRender().then(() => {
              expect(day.textContent).toBe('29')
              expect(
                control.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value,
              ).toBe('2024-02-29T15:30')
              control.remove()
              dispose()
              resolve()
            })
          })
        })
      }),
    ))

  it('clears individual segments with backspace or delete and renders contextual placeholders', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime | null>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            locale="en-AU"
            formatOptions={{ hourCycle: 'h23' }}
            value={value()}
            onValueChange={setValue}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
        segments[0]!.focus()
        key(segments[0]!, 'Backspace')
        nextRender().then(() => {
          expect(value()).toBeNull()
          expect(segments[0]?.textContent).toBe('dd')
          key(segments[1]!, 'Delete')
          key(segments[2]!, 'Backspace')
          key(segments[3]!, 'Delete')
          key(segments[4]!, 'Backspace')
          nextRender().then(() => {
            expect(control.textContent).toContain('dd/mm/yyyy, --:--')
            expect(control.querySelectorAll('.datetime-neo__placeholder')).toHaveLength(5)
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('advances once a one-digit segment cannot accept another digit', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const [value, setValue] = createSignal<DateTime>(date('2026-08-17T15:30'))
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />
        ) as HTMLSpanElement
        document.body.append(control)
        const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        month.focus()
        key(month, '5')
        nextRender().then(() => {
          expect(localValue(value())).toBe('2026-05-17T15:30')
          expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[1])
          control.remove()
          dispose()
          resolve()
        })
      }),
    ))

  it('interprets a partial two-digit year in the closest century when leaving the segment', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const onValueChange = vi.fn()
        const control = (
          <DateTimeLocal
            referenceTime={referenceTime}
            value={date('2026-08-17T15:30')}
            onValueChange={onValueChange}
          />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
        year.focus()
        key(year, '8')
        key(year, '8')
        nextRender().then(() => {
          expect(year.textContent).toBe('88')
          key(year, 'ArrowRight')
          nextRender().then(() => {
            expect(localValue(onValueChange.mock.calls.at(-1)?.[0])).toBe('1988-08-17T15:30')
            const updatedYear =
              control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
            updatedYear.focus()
            key(updatedYear, '6')
            key(updatedYear, '3')
            key(updatedYear, 'ArrowRight')
            nextRender().then(() => {
              expect(localValue(onValueChange.mock.calls.at(-1)?.[0])).toBe('2063-08-17T15:30')
              control.remove()
              dispose()
              resolve()
            })
          })
        })
      }),
    ))

  it('pads a partial year after the segment loses focus', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        document.body.append(control)
        const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
        year.focus()
        key(year, '2')
        key(year, '6')
        nextRender().then(() => {
          expect(year.textContent).toBe('26')
          control
            .querySelector<HTMLButtonElement>('[aria-label="Open date and time picker"]')!
            .focus()
          nextRender().then(() => {
            expect(year.textContent).toBe('2026')
            control.remove()
            dispose()
            resolve()
          })
        })
      }),
    ))

  it('updates an uncontrolled value and honors readonly and disabled states', async () =>
    await new Promise<void>(resolve =>
      createRoot(dispose => {
        const control = (
          <DateTimeLocal referenceTime={referenceTime} defaultValue={date('2026-08-17T15:30')} />
        ) as HTMLSpanElement
        const readonly = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} readonly />
        ) as HTMLSpanElement
        const disabled = (
          <DateTimeLocal referenceTime={referenceTime} value={date('2026-08-17T15:30')} disabled />
        ) as HTMLSpanElement
        document.body.append(control, readonly, disabled)
        const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        month.focus()
        key(month, 'ArrowUp')
        nextRender().then(() => {
          expect(
            control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]?.textContent,
          ).toBe('9')
          key(readonly.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!, 'ArrowUp')
          expect(
            readonly.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]?.textContent,
          ).toBe('8')
          expect(readonly.querySelector('.datetime-neo__actions')).toBeNull()
          expect(readonly.querySelector('.datetime-neo__trigger')).toBeNull()
          const readonlySegment = readonly.querySelector<HTMLElement>('.datetime-neo__segment')!
          expect(readonlySegment.getAttribute('contenteditable')).toBeNull()
          expect(readonlySegment.getAttribute('tabindex')).toBeNull()
          readonlySegment.focus()
          expect(document.activeElement).not.toBe(readonlySegment)
          expect(
            disabled.querySelector('.datetime-neo__segment')?.getAttribute('aria-disabled'),
          ).toBe('true')
          expect(disabled.querySelector('.datetime-neo__actions')).toBeNull()
          expect(disabled.querySelector('.datetime-neo__trigger')).toBeNull()
          const disabledSegment = disabled.querySelector<HTMLElement>('.datetime-neo__segment')!
          expect(disabledSegment.getAttribute('contenteditable')).toBeNull()
          expect(disabledSegment.getAttribute('tabindex')).toBeNull()
          disabledSegment.focus()
          expect(document.activeElement).not.toBe(disabledSegment)
          control.remove()
          readonly.remove()
          disabled.remove()
          dispose()
          resolve()
        })
      }),
    ))
})
