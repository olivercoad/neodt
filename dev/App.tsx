import { createMemo, createSignal, For, Show, type Component } from 'solid-js'
import { DateTime } from 'luxon'
import Neodt from 'src'
import styles from './App.module.css'

const locales = [
  ['en-US', 'English (United States)'],
  ['en-GB', 'English (United Kingdom)'],
  ['de-DE', 'Deutsch (Deutschland)'],
  ['fr-FR', 'Francais (France)'],
  ['ja-JP', 'Japanese (Japan)'],
] as const

type DayPeriod = 'locale' | '12' | '24'

const initialReference = DateTime.fromISO('2026-08-18T09:30:00', { zone: 'Australia/Sydney' })
const initialValue = DateTime.fromISO('2026-08-24T14:30:00', { zone: 'Australia/Sydney' })

function iso(date: DateTime | null): string {
  return date?.toISO({ precision: 'minutes', suppressSeconds: true, includeOffset: false }) ?? 'null'
}

const App: Component = () => {
  const [referenceTime, setReferenceTime] = createSignal(initialReference)
  const [locale, setLocale] = createSignal<Intl.LocalesArgument>('en-US')
  const [dayPeriod, setDayPeriod] = createSignal<DayPeriod>('locale')
  const [value, setValue] = createSignal<DateTime | null>(initialValue)
  const [readonly, setReadonly] = createSignal(false)
  const [disabled, setDisabled] = createSignal(false)

  const formatOptions = createMemo<Intl.DateTimeFormatOptions>(() => {
    if (dayPeriod() === '12') return { hour12: true }
    if (dayPeriod() === '24') return { hour12: false }
    return {}
  })

  const code = createMemo(() => {
    const optionLines = [
      `  referenceTime={referenceTime()}`,
      `  locale="${locale()}"`,
      dayPeriod() === 'locale' ? undefined : `  formatOptions={{ hour12: ${dayPeriod() === '12'} }}`,
      readonly() ? '  readonly' : undefined,
      disabled() ? '  disabled' : undefined,
      '  value={value()}',
      '  onValueChange={setValue}',
    ].filter(Boolean)
    return `import Neodt from 'neodt'\n\n<Neodt\n${optionLines.join('\n')}\n/>`
  })

  const reset = () => {
    setReferenceTime(initialReference)
    setLocale('en-US')
    setDayPeriod('locale')
    setValue(initialValue)
    setReadonly(false)
    setDisabled(false)
  }

  return (
    <main class={styles.page}>
      <nav class={styles.nav} aria-label="Main navigation">
        <a class={styles.brand} href="#top"><span>n</span> neodt</a>
        <div class={styles.navLinks}>
          <a href="#comparison">Compare</a>
          <a href="#playground">Playground</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </nav>

      <section id="top" class={styles.hero}>
        <div class={styles.heroCopy}>
          <p class={styles.kicker}>A DATETIME INPUT FOR SOLID</p>
          <h1>Feels native.<br />Works <i>your way.</i></h1>
          <p class={styles.lede}>neodt is a familiar, timezone-aware datetime input for Solid. It speaks your users' language, works naturally with a keyboard, and gives your app a robust <a href="https://github.com/moment/luxon/" target="_blank" rel="noreferrer">Luxon <code>DateTime</code></a> instead of a string to untangle.</p>
          <div class={styles.install}><code>pnpm add neodt luxon</code><span>Solid 1.6+</span></div>
        </div>
        <div class={styles.compareGrid}>
          <article class={styles.compareCard}>
            <div class={styles.cardHead}><span class={styles.dot} /> neodt <b>Recommended</b></div>
            <label>Meeting starts</label>
            <Neodt class={styles.compareInput} referenceTime={initialReference} defaultValue={initialValue} locale="en-US" />
            <ul><li>Locale-aware order and clock format</li><li>Keyboard-friendly segment editing</li><li>Native picker and natural language entry</li></ul>
          </article>
          <article class={`${styles.compareCard} ${styles.nativeCard}`}>
            <div class={styles.cardHead}><span class={styles.nativeDot} /> Native <b>Browser UI</b></div>
            <label for="native-datetime">Meeting starts</label>
            <input id="native-datetime" type="datetime-local" value="2026-08-24T14:30" />
            <ul><li>Presentation varies by browser</li><li>String value parsing required</li><li>Limited styling surface</li></ul>
          </article>
        </div>
      </section>

      <section id="playground" class={styles.playgroundSection}>
        <div class={styles.playgroundHeading}>
          <p class={styles.kicker}>CONFIGURATION LAB</p>
          <h2>Make it feel<br />at home.</h2>
          <p>Try the options and see the setup update as you go. The reference time supplies the timezone and helps complete partial dates.</p>
        </div>
        <div class={styles.playground}>
          <div class={styles.settings}>
            <div class={styles.settingsTop}><span>Input settings</span><button type="button" onClick={reset}>Reset</button></div>
            <label class={styles.field}><span class={styles.fieldLabel}>Reference time <em>timezone + defaults</em></span><Neodt class={styles.previewInput} referenceTime={initialReference} value={referenceTime()} onValueChange={next => next && setReferenceTime(next)} /></label>
            <div class={styles.twoFields}>
              <label class={styles.field}><span class={styles.fieldLabel}>Locale</span><select value={locale() as string} onChange={event => setLocale(event.currentTarget.value)}><For each={locales}>{([name, label]) => <option value={name}>{label}</option>}</For></select></label>
              <label class={styles.field}><span class={styles.fieldLabel}>Clock</span><select value={dayPeriod()} onChange={event => setDayPeriod(event.currentTarget.value as DayPeriod)}><option value="locale">Locale dependent</option><option value="12">12 hour / AM PM</option><option value="24">24 hour</option></select></label>
            </div>
            <div class={styles.toggleRow}>
              <label><input type="checkbox" checked={readonly()} onChange={event => setReadonly(event.currentTarget.checked)} /> Readonly</label>
              <label><input type="checkbox" checked={disabled()} onChange={event => setDisabled(event.currentTarget.checked)} /> Disabled</label>
            </div>
          </div>
          <div class={styles.preview}>
            <div class={styles.previewTop}><span>Preview</span><code>{referenceTime().zoneName}</code></div>
            <label>Appointment time</label>
            <Neodt class={styles.previewInput} referenceTime={referenceTime()} value={value()} locale={locale()} formatOptions={formatOptions()} readonly={readonly()} disabled={disabled()} onValueChange={setValue} />
            <div class={styles.valueLine}><span>Current value</span><code>{iso(value())}</code></div>
          </div>
          <div class={styles.codePanel}>
            <div class={styles.codeTop}><span>Appointment.tsx</span><span>TSX</span></div>
            <pre><code>{code()}</code></pre>
          </div>
        </div>
      </section>

      <section class={styles.notes}>
        <div><span>01</span><h3>Easy on the keyboard</h3><p>Move between segments with arrow keys, type a value, or use up and down to adjust it.</p></div>
        <div><span>02</span><h3>Right for each locale</h3><p>Date order, separators, and 12 or 24-hour time all follow the locale you set.</p></div>
        <div><span>03</span><h3>Still feels familiar</h3><p>Use the browser picker when it is useful, with a control you can style to fit your app.</p></div>
      </section>
      <footer><span>neodt</span><span>Local time, without compromises.</span><a href="#top">Back to top ↑</a></footer>
    </main>
  )
}

export default App
