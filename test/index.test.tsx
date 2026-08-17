import { createRoot, createSignal } from 'solid-js'
import { isServer } from 'solid-js/web'
import { DateTime } from 'luxon'
import { describe, expect, it, vi } from 'vitest'
import { DateTimeLocal, type DateTimeLocalValue } from '../src'

const referenceTime = DateTime.fromISO('2026-08-17T15:30:00Z')

function key(element: HTMLElement, keyName: string) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }))
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

describe('DateTimeLocal', () => {
  it('renders locale-ordered editable segments with a hidden native input and picker button', () =>
    createRoot(() => {
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-GB" value="2026-08-17T15:30" />) as HTMLSpanElement
      expect(control.querySelectorAll('.datetime-neo__segment')[0]?.textContent).toBe('17')
      expect(control.querySelector<HTMLInputElement>('input[type="datetime-local"]')?.value).toBe('2026-08-17T15:30')
      expect(control.querySelector('.datetime-neo__trigger')).not.toBeNull()
    }))

  it('opens the native picker from the trigger or Space key', () =>
    createRoot(dispose => {
      const showPicker = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" />) as HTMLSpanElement
      const input = control.querySelector<HTMLInputElement>('input')!
      const trigger = control.querySelector<HTMLButtonElement>('.datetime-neo__trigger')!
      Object.defineProperty(input, 'showPicker', { value: showPicker })
      document.body.append(control)
      trigger.click()
      key(control.querySelector<HTMLButtonElement>('.datetime-neo__segment')!, ' ')
      expect(showPicker).toHaveBeenCalledTimes(2)
      control.remove()
      dispose()
    }))

  it('uses a custom calendar icon and updates from native input changes', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} calendarIcon={<span>Choose</span>} onValueChange={onValueChange} />) as HTMLSpanElement
      const input = control.querySelector<HTMLInputElement>('input')!
      document.body.append(control)
      expect(control.querySelector('.datetime-neo__trigger')?.textContent).toBe('Choose')
      input.value = '2026-09-01T08:45'
      input.dispatchEvent(new InputEvent('input', { bubbles: true }))
      expect(onValueChange).toHaveBeenCalledWith('2026-09-01T08:45')
      control.remove()
      dispose()
    }))

  it('restores cleared segments from a native picker change event', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" onValueChange={onValueChange} />) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
      key(year, 'Backspace')
      const input = control.querySelector<HTMLInputElement>('input')!
      expect(input.value).toBe('2026-08-17T15:30')
      input.value = '2026-09-01T08:45'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      expect(onValueChange).toHaveBeenLastCalledWith('2026-09-01T08:45')
      expect(control.querySelector<HTMLButtonElement>('[aria-label="year"]')?.textContent).toBe('2026')
      control.remove()
      dispose()
    }))

  it('clears every segment when the native picker is cleared', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" onValueChange={onValueChange} />) as HTMLSpanElement
      document.body.append(control)
      const input = control.querySelector<HTMLInputElement>('input')!
      input.value = ''
      input.dispatchEvent(new Event('change', { bubbles: true }))
      expect(onValueChange).toHaveBeenCalledWith('')
      nextRender().then(() => {
        expect(control.querySelectorAll('.datetime-neo__placeholder')).toHaveLength(6)
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('uses the locale default width for hours and minutes', () =>
    createRoot(() => {
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-US" value="2026-08-17T05:03" />) as HTMLSpanElement
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
      expect(segments[3]?.textContent).toBe('5')
      expect(segments[4]?.textContent).toBe('03')
    }))

  it('renders every segment as a placeholder for an initially empty value', () =>
    createRoot(() => {
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-US" formatOptions={{ hour12: true }} value="" />) as HTMLSpanElement
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
      expect(segments[5]?.textContent).toBe('--')
      expect(control.querySelectorAll('.datetime-neo__placeholder')).toHaveLength(6)
    }))

  it('sets the draft day period directly with a and p keys', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-US" formatOptions={{ hour12: true }} value="" />) as HTMLSpanElement
      document.body.append(control)
      const dayPeriod = () => control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')!
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
    })))

  it('selects focused segments and moves focus with left and right arrows', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" />) as HTMLSpanElement
      document.body.append(control)
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
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
    })))

  it('increments and decrements the selected locale segment', () =>
    createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" onValueChange={onValueChange} />) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, 'ArrowUp')
      key(month, 'ArrowDown')
      expect(onValueChange).toHaveBeenNthCalledWith(1, '2026-09-17T15:30')
      expect(onValueChange).toHaveBeenNthCalledWith(2, '2026-07-17T15:30')
      control.remove()
      dispose()
    }))

  it('keeps focus while repeatedly adjusting a segment', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<'2026-08-17T15:30' | '2026-09-17T15:30' | '2026-10-17T15:30'>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, 'ArrowUp')
      nextRender().then(() => {
        const updatedMonth = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
        expect(updatedMonth).toBe(month)
        expect(document.activeElement).toBe(updatedMonth)
        key(updatedMonth, 'ArrowUp')
        nextRender().then(() => {
          expect(value()).toBe('2026-10-17T15:30')
          expect(control.querySelectorAll('.datetime-neo__segment')[0]).toBe(month)
          expect(document.activeElement).toBe(month)
          control.remove()
          dispose()
          resolve()
        })
      })
    })))

  it('accepts numeric entry and advances after a complete segment', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<'2026-08-17T15:30' | '2026-12-17T15:30'>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, '1')
      key(month, '2')
      nextRender().then(() => {
        expect(value()).toBe('2026-12-17T15:30')
        nextRender().then(() => {
          expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[1])
          control.remove()
          dispose()
          resolve()
        })
      })
    })))

  it('updates the displayed year after controlled numeric entry', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
      year.focus()
      key(year, '2')
      key(year, '0')
      key(year, '1')
      key(year, '5')
      nextRender().then(() => {
        expect(value()).toBe('2015-08-17T15:30')
        expect(year.textContent).toBe('2015')
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('keeps draft segment values visible while the external value is incomplete', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
      year.focus()
      key(year, '2')
      key(year, '0')
      key(year, '1')
      key(year, '5')
      key(year, 'ArrowUp')
      nextRender().then(() => {
        expect(value()).toBe('')
        expect(year.textContent).toBe('2016')
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('preserves leading zero entry until the segment is complete', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<'2026-05-17T15:30' | '2026-08-17T15:30'>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, '0')
      expect(document.activeElement).toBe(month)
      key(month, '5')
      nextRender().then(() => {
        expect(value()).toBe('2026-05-17T15:30')
        expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[1])
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('preserves a leading zero while entering an hour', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<'2026-08-17T15:30' | '2026-08-17T17:30'>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} locale="en-US" formatOptions={{ hour12: true }} />) as HTMLSpanElement
      document.body.append(control)
      const hour = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[3]!
      hour.focus()
      key(hour, '0')
      expect(document.activeElement).toBe(hour)
      key(hour, '5')
      nextRender().then(() => {
        expect(value()).toBe('2026-08-17T17:30')
        expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[4])
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('sets PM when a 12-hour entry exceeds 12', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('2026-08-17T05:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-US" formatOptions={{ hour12: true }} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
      key(hour, '1')
      key(hour, '5')
      nextRender().then(() => {
        expect(value()).toBe('2026-08-17T15:30')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe('3')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')?.textContent).toBe('PM')
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('keeps a 24-hour entry unchanged when it exceeds 12', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('2026-08-17T05:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-AU" formatOptions={{ hourCycle: 'h23' }} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
      key(hour, '1')
      key(hour, '5')
      nextRender().then(() => {
        expect(value()).toBe('2026-08-17T15:30')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe('15')
        expect(control.querySelector('[aria-label="dayPeriod"]')).toBeNull()
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('sets the draft day period to PM when the year is cleared', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('2026-08-17T05:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-US" formatOptions={{ hour12: true }} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelector<HTMLButtonElement>('[aria-label="year"]')!
      key(year, 'Backspace')
      const hour = control.querySelector<HTMLButtonElement>('[aria-label="hour"]')!
      key(hour, '1')
      key(hour, '5')
      nextRender().then(() => {
        expect(value()).toBe('')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="year"]')?.textContent).toBe('yyyy')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="hour"]')?.textContent).toBe('3')
        expect(control.querySelector<HTMLButtonElement>('[aria-label="dayPeriod"]')?.textContent).toBe('PM')
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('clears individual segments with backspace or delete and renders contextual placeholders', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<DateTimeLocalValue>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} locale="en-AU" formatOptions={{ hourCycle: 'h23' }} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const segments = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')
      segments[0]!.focus()
      key(segments[0]!, 'Backspace')
      nextRender().then(() => {
        expect(value()).toBe('')
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
    })))

  it('advances once a one-digit segment cannot accept another digit', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const [value, setValue] = createSignal<'2026-05-17T15:30' | '2026-08-17T15:30'>('2026-08-17T15:30')
      const control = (<DateTimeLocal referenceTime={referenceTime} value={value()} onValueChange={setValue} />) as HTMLSpanElement
      document.body.append(control)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, '5')
      nextRender().then(() => {
        expect(value()).toBe('2026-05-17T15:30')
        expect(document.activeElement).toBe(control.querySelectorAll('.datetime-neo__segment')[1])
        control.remove()
        dispose()
        resolve()
      })
    })))

  it('interprets a partial two-digit year in the closest century when leaving the segment', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const onValueChange = vi.fn()
      const control = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" onValueChange={onValueChange} />) as HTMLSpanElement
      document.body.append(control)
      const year = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
      year.focus()
      key(year, '8')
      key(year, '8')
      key(year, 'ArrowRight')
      nextRender().then(() => {
        expect(onValueChange).toHaveBeenLastCalledWith('1988-08-17T15:30')
        const updatedYear = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[2]!
        updatedYear.focus()
        key(updatedYear, '6')
        key(updatedYear, '3')
        key(updatedYear, 'ArrowRight')
        nextRender().then(() => {
          expect(onValueChange).toHaveBeenLastCalledWith('2063-08-17T15:30')
          control.remove()
          dispose()
          resolve()
        })
      })
    })))

  it('updates an uncontrolled value and honors readonly and disabled states', async () =>
    await new Promise<void>(resolve => createRoot(dispose => {
      const control = (<DateTimeLocal referenceTime={referenceTime} defaultValue="2026-08-17T15:30" />) as HTMLSpanElement
      const readonly = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" readonly />) as HTMLSpanElement
      const disabled = (<DateTimeLocal referenceTime={referenceTime} value="2026-08-17T15:30" disabled />) as HTMLSpanElement
      document.body.append(control, readonly, disabled)
      const month = control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!
      month.focus()
      key(month, 'ArrowUp')
      nextRender().then(() => {
        expect(control.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]?.textContent).toBe('9')
        key(readonly.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]!, 'ArrowUp')
        expect(readonly.querySelectorAll<HTMLButtonElement>('.datetime-neo__segment')[0]?.textContent).toBe('8')
        expect(disabled.querySelector<HTMLButtonElement>('.datetime-neo__segment')?.disabled).toBe(true)
        control.remove(); readonly.remove(); disabled.remove()
        dispose()
        resolve()
      })
    })))
})
