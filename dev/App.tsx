import { createSignal, For, type Component } from 'solid-js'
import { DateTime } from 'luxon'
import { DateTimeLocal } from 'src'
import styles from './App.module.css'

const locales = [
  ['en-US', 'English (United States)'],
  ['en-GB', 'English (United Kingdom)'],
  ['en-AU', 'English (Australia)'],
  ['de-DE', 'Deutsch (Deutschland)'],
  ['ja-JP', 'Japanese (Japan)'],
  ['zh-CN', 'Chinese (China)'],
] as const

const referenceTime = DateTime.fromISO('2023-04-04T12:00:00Z')

const App: Component = () => {
  const [locale, setLocale] = createSignal<Intl.LocalesArgument>('en-US')
  const [appointment, setAppointment] = createSignal<DateTime | null>(DateTime.fromISO('2026-08-24T14:30:00Z'))

  return (
    <main class={styles.page}>
      <nav class={styles.nav} aria-label="Main navigation">
        <a class={styles.brand} href="#top">
          <span class={styles.brandMark}>dt</span>
          neodt
        </a>
        <a href="#playground">Playground</a>
        <a href="#usage">Usage</a>
        <a class={styles.github} href="https://github.com" target="_blank" rel="noreferrer">
          GitHub <span aria-hidden="true">&#8599;</span>
        </a>
      </nav>

      <section id="top" class={styles.hero}>
        <div class={styles.heroCopy}>
          <p class={styles.eyebrow}>SOLIDJS DATE + TIME INPUT</p>
          <h1>Native behavior.<br /><em>Your</em> interface.</h1>
          <p class={styles.intro}>
            A locale-aware, styleable segmented datetime control for JavaScript-managed application state.
            Keep keyboard-first editing without inheriting browser input limitations.
          </p>
          <div class={styles.heroActions}>
            <a class={styles.primaryLink} href="#playground">Try the control <span aria-hidden="true">&#8595;</span></a>
            <a class={styles.textLink} href="#usage">Read the API</a>
          </div>
        </div>
        <div class={styles.heroArt} aria-hidden="true">
          <div class={styles.clockFace}><span>12</span><span>3</span><span>6</span><span>9</span><i /><b /></div>
          <div class={styles.orbit} />
          <p>LOCAL<br />TIME</p>
        </div>
      </section>

      <section id="playground" class={styles.section}>
        <div class={styles.sectionHeading}>
          <p class={styles.eyebrow}>INTERACTIVE PLAYGROUND</p>
          <h2>Make the browser speak your language.</h2>
            <p>The application value remains a Luxon DateTime. Only the presentation changes.</p>
        </div>
        <div class={styles.playground}>
          <div class={styles.controls}>
            <label class={styles.selectLabel}>
              <span>Display locale</span>
              <select value={locale() as string} onChange={event => setLocale(event.currentTarget.value)}>
                <For each={locales}>{([value, label]) => <option value={value}>{label}</option>}</For>
              </select>
            </label>
            <DateTimeLocal
              class={styles.demoInput}
              referenceTime={referenceTime}
              value={appointment()}
              locale={locale()}
              onValueChange={setAppointment}
            />
            <div class={styles.valueReadout}>
              <span>Native value</span>
              <code>{appointment()?.toISO({ precision: "minutes" }) ?? 'null'}</code>
            </div>
          </div>
          <div class={styles.codePanel}>
            <div class={styles.codeTop}><span>Appointment.tsx</span><span>TSX</span></div>
            <pre><code>{`<DateTimeLocal
  name="appointment"
  referenceTime={referenceTime}
  value={value()}
  locale="${locale()}"
  min="2026-08-17T09:00"
  onValueChange={setValue}
/>`}</code></pre>
          </div>
        </div>
      </section>

      <section class={styles.featureGrid}>
        <article><span class={styles.number}>01</span><h3>Segmented editing</h3><p>Click individual fields or use arrows and numbers without moving to a text cursor.</p></article>
        <article><span class={styles.number}>02</span><h3>Locale order</h3><p>Date and time fields follow the locale you specify, rather than the system default.</p></article>
        <article><span class={styles.number}>03</span><h3>CSS control</h3><p>Style the visible field with classes and custom properties.</p></article>
      </section>

      <section class={styles.usageSection} id="usage">
        <div class={styles.usageIntro}>
          <p class={styles.eyebrow}>CONTROLLED STATE</p>
          <h2>It belongs in your state.</h2>
          <p>The component emits Luxon DateTime values, making it direct to integrate with Solid signals and SPA data models.</p>
        </div>
        <div class={styles.bookingCard}>
          <div class={styles.cardTop}><span>Studio booking</span><span>UTC not applied</span></div>
          <label>Choose a local start time</label>
          <DateTimeLocal referenceTime={referenceTime} defaultValue={DateTime.fromISO('2026-09-04T10:00:00Z')} locale="en-GB" />
          <p class={styles.submitResult}>Use arrow keys to adjust the selected part.</p>
        </div>
      </section>

      <section class={styles.themeSection}>
        <div><p class={styles.eyebrow}>YOUR DESIGN SYSTEM</p><h2>Not a browser default in disguise.</h2></div>
        <div class={styles.darkExample}>
          <DateTimeLocal referenceTime={referenceTime} defaultValue={DateTime.fromISO('2026-10-15T18:45:00Z')} locale="de-DE" />
          <code>--datetime-neo-focus: #e6ff73;</code>
        </div>
      </section>

      <footer class={styles.footer}><span>neodt / SolidJS</span><span>Built for local time.</span></footer>
    </main>
  )
}

export default App
