import { makePersisted, type PersistenceOptions } from "@solid-primitives/storage";
import { DateTime } from "luxon";
import { createMemo, createSignal, For, onCleanup, onMount, type Component } from "solid-js";
import Neodt from "src";

import styles from "./App.module.css";

const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
const systemTimezone = DateTime.now().zoneName ?? "UTC";

const locales = [
  ["", `System (${systemLocale})`],
  ["en-AU", "English (Australia)"],
  ["en-US", "English (United States)"],
  ["en-GB", "English (United Kingdom)"],
  ["de-DE", "Deutsch (Deutschland)"],
  ["fr-FR", "Francais (France)"],
  ["ja-JP", "Japanese (Japan)"],
];

const timezones = [
  [systemTimezone, `System (${systemTimezone})`],
  ["Australia/Sydney", "Sydney (Australia/Sydney)"],
  ["Australia/Lord_Howe", "Lord Howe (Australia/Lord_Howe)"],
  ["America/New_York", "New York (America/New_York)"],
  ["Europe/London", "London (Europe/London)"],
  ["Asia/Tokyo", "Tokyo (Asia/Tokyo)"],
  ["UTC", "UTC"],
].filter(
  ([timezone], index, options) => options.findIndex(([value]) => value === timezone) === index,
);

type DayPeriod = "locale" | "12" | "24";
type Timezone = string;

const initialValue: DateTime = DateTime.fromISO("2026-08-24T14:30:00", {
  zone: "Australia/Sydney",
});
const minimumPreviewWidth = 100;

function makePersistedSignal<T>(initialValue: T, options: PersistenceOptions<T, undefined>) {
  return makePersisted(createSignal(initialValue), options);
}

function iso(date: DateTime | null): string {
  return date?.toISO({ precision: "minutes" }) ?? "null";
}

const App: Component = () => {
  const [timezone, setTimezone] = makePersistedSignal<Timezone>(systemTimezone, {
    name: "neodt-configuration-lab-timezone",
  });
  const [now, setNow] = createSignal(DateTime.now());
  const referenceTimeInputReference = () => now().setZone(timezone());
  const [referenceTime, setReferenceTime] = makePersistedSignal(referenceTimeInputReference(), {
    name: "neodt-configuration-lab-reference-time",
    serialize: (value) => value.toISO() ?? "",
    deserialize: (value) =>
      DateTime.fromISO(value, {
        zone: timezone(),
      }),
  });
  const [locale, setLocale] = makePersistedSignal<string | undefined>(undefined, {
    name: "neodt-configuration-lab-locale",
  });
  const [dayPeriod, setDayPeriod] = makePersistedSignal<DayPeriod>("locale", {
    name: "neodt-configuration-lab-day-period",
  });
  const [value, setValue] = makePersistedSignal<DateTime | null>(initialValue, {
    name: "neodt-configuration-lab-value",
    serialize: (value) => iso(value),
    deserialize: (value) => (value === "null" ? null : DateTime.fromISO(value)),
  });
  const [showTimeOffset, setShowTimeOffset] = makePersistedSignal(false, {
    name: "neodt-configuration-lab-show-time-offset",
  });
  const [readonly, setReadonly] = makePersistedSignal(false, {
    name: "neodt-configuration-lab-readonly",
  });
  const [disabled, setDisabled] = makePersistedSignal(false, {
    name: "neodt-configuration-lab-disabled",
  });
  const [previewWidth, setPreviewWidth] = makePersistedSignal(320, {
    name: "neodt-configuration-lab-preview-width",
  });
  let previewInputArea: HTMLDivElement | undefined;
  let dragStart: { pointerId: number; x: number; width: number } | undefined;

  const maximumPreviewWidth = () =>
    Math.max(minimumPreviewWidth, (previewInputArea?.clientWidth ?? minimumPreviewWidth) - 60);
  const clampPreviewWidth = (width: number) =>
    Math.round(Math.max(minimumPreviewWidth, Math.min(width, maximumPreviewWidth())));

  onMount(() => {
    const updateMaximumWidth = () => {
      setPreviewWidth((width) => {
        const nextWidth = clampPreviewWidth(width);
        return nextWidth === width ? width : nextWidth;
      });
    };
    const observer = new ResizeObserver(updateMaximumWidth);
    if (previewInputArea) observer.observe(previewInputArea);
    updateMaximumWidth();
    const timer = window.setInterval(() => setNow(DateTime.now()), 60_000);
    onCleanup(() => {
      observer.disconnect();
      window.clearInterval(timer);
    });
  });

  const formatOptions = createMemo<Intl.DateTimeFormatOptions>(() => {
    if (dayPeriod() === "12") return { hour12: true };
    if (dayPeriod() === "24") return { hour12: false };
    return {};
  });

  const code = createMemo(() => {
    const optionLines = [
      `  referenceTime={referenceTime()}`,
      locale() ? `  locale="${locale()}"` : undefined,
      dayPeriod() === "locale"
        ? undefined
        : `  formatOptions={{ hour12: ${dayPeriod() === "12"} }}`,
      showTimeOffset() ? "  showTimeOffset" : undefined,
      readonly() ? "  readonly" : undefined,
      disabled() ? "  disabled" : undefined,
      "  value={value()}",
      "  onValueChange={setValue}",
    ].filter(Boolean);
    return `import Neodt from '@olicoad/neodt'\n\n<Neodt\n${optionLines.join("\n")}\n/>`;
  });

  const reset = () => {
    setReferenceTime(DateTime.now());
    setTimezone(systemTimezone);
    setLocale(undefined);
    setDayPeriod("locale");
    setValue(initialValue);
    setShowTimeOffset(false);
    setReadonly(false);
    setDisabled(false);
    setPreviewWidth(320);
  };

  const setReferenceTimezone = (nextTimezone: Timezone) => {
    setTimezone(nextTimezone);
    setReferenceTime(referenceTime().setZone(nextTimezone));
  };

  return (
    <main class={styles.page}>
      <nav class={styles.nav} aria-label="Main navigation">
        <a class={styles.brand} href="#top">
          <span>n</span> neodt
        </a>
        <div class={styles.navLinks}>
          <a href="#comparison">Compare</a>
          <a href="#playground">Playground</a>
          <a href="https://github.com/olivercoad/neodt" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </nav>

      <section id="top" class={styles.hero}>
        <div class={styles.heroCopy}>
          <p class={styles.kicker}>A DATETIME INPUT FOR SOLID</p>
          <h1>
            Feels native.
            <br />
            Works <i>your way.</i>
          </h1>
          <p class={styles.lede}>
            neodt is a familiar, timezone-aware datetime input for Solid. It speaks your users'
            language, works naturally with a keyboard, and gives your app a robust{" "}
            <a href="https://github.com/moment/luxon/" target="_blank" rel="noreferrer">
              Luxon <code>DateTime</code>
            </a>{" "}
            instead of a string to untangle.
          </p>
          <div class={styles.install}>
            <code>pnpm add @olicoad/neodt luxon</code>
            <span>Solid 1.6+</span>
          </div>
        </div>
        <div id="comparison" class={styles.compareGrid}>
          <article class={styles.compareCard}>
            <div class={styles.cardHead}>
              <span class={styles.dot} /> neodt <b>Recommended</b>
            </div>
            <label>Meeting starts</label>
            <Neodt
              class={styles.compareInput}
              referenceTime={now()}
              defaultValue={initialValue}
              locale={navigator.language}
            />
            <ul>
              <li>Locale-aware order and clock format</li>
              <li>Keyboard-friendly segment editing</li>
              <li>Native picker and natural language entry</li>
            </ul>
          </article>
          <article class={`${styles.compareCard} ${styles.nativeCard}`}>
            <div class={styles.cardHead}>
              <span class={styles.nativeDot} /> Native <b>Browser UI</b>
            </div>
            <label for="native-datetime">Meeting starts</label>
            <input id="native-datetime" type="datetime-local" value="2026-08-24T14:30" />
            <ul>
              <li>Presentation varies by browser</li>
              <li>String value parsing required</li>
              <li>Limited styling surface</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="playground" class={styles.playgroundSection}>
        <div class={styles.playgroundHeading}>
          <p class={styles.kicker}>CONFIGURATION LAB</p>
          <h2>
            Make it feel
            <br />
            at home.
          </h2>
          <p>
            Try the options and see the setup update as you go. The reference time supplies the
            timezone and helps complete partial dates.
          </p>
        </div>
        <div class={styles.playground}>
          <div class={styles.settings}>
            <div class={styles.settingsTop}>
              <span>Input settings</span>
              <button type="button" onClick={reset}>
                Reset
              </button>
            </div>
            <div class={styles.field}>
              <span class={styles.fieldLabel}>
                Reference time <em>timezone + defaults</em>
              </span>
              <Neodt
                class={styles.previewInput}
                referenceTime={referenceTimeInputReference()}
                value={referenceTime()}
                onValueChange={(next) => next && setReferenceTime(next)}
                showTimeOffset
              />
            </div>
            <label class={styles.field}>
              <span class={styles.fieldLabel}>Timezone</span>
              <select
                value={timezone()}
                onChange={(event) => setReferenceTimezone(event.currentTarget.value as Timezone)}
              >
                <For each={timezones}>
                  {([name, label]) => <option value={name}>{label}</option>}
                </For>
              </select>
            </label>
            <div class={styles.twoFields}>
              <label class={styles.field}>
                <span class={styles.fieldLabel}>Locale</span>
                <select
                  value={locale() ?? ""}
                  onChange={(event) => setLocale(event.currentTarget.value || undefined)}
                >
                  <For each={locales}>
                    {([name, label]) => <option value={name}>{label}</option>}
                  </For>
                </select>
              </label>
              <label class={styles.field}>
                <span class={styles.fieldLabel}>Clock</span>
                <select
                  value={dayPeriod()}
                  onChange={(event) => setDayPeriod(event.currentTarget.value as DayPeriod)}
                >
                  <option value="locale">Locale dependent</option>
                  <option value="12">12 hour / AM PM</option>
                  <option value="24">24 hour</option>
                </select>
              </label>
            </div>
            <div class={styles.toggleRow}>
              <label>
                <input
                  type="checkbox"
                  checked={showTimeOffset()}
                  onChange={(event) => setShowTimeOffset(event.currentTarget.checked)}
                />{" "}
                Time offset
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={readonly()}
                  onChange={(event) => setReadonly(event.currentTarget.checked)}
                />{" "}
                Readonly
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={disabled()}
                  onChange={(event) => setDisabled(event.currentTarget.checked)}
                />{" "}
                Disabled
              </label>
            </div>
          </div>
          <div class={styles.preview}>
            <div class={styles.previewTop}>
              <span>Preview</span>
              <code>{referenceTime().zoneName}</code>
            </div>
            <label>Appointment time</label>
            <div
              class={styles.resizablePreviewInput}
              ref={(element) => (previewInputArea = element)}
            >
              <div class={styles.previewInputSizer} style={{ width: `${previewWidth()}px` }}>
                <Neodt
                  class={styles.previewInput}
                  referenceTime={referenceTime()}
                  value={value()}
                  {...(locale() ? { locale: locale() } : {})}
                  formatOptions={formatOptions()}
                  showTimeOffset={showTimeOffset()}
                  readonly={readonly()}
                  disabled={disabled()}
                  onValueChange={setValue}
                />
                <button
                  class={styles.resizeHandle}
                  type="button"
                  aria-label="Resize preview input"
                  aria-valuetext={`${previewWidth()}px`}
                  onPointerDown={(event) => {
                    dragStart = {
                      pointerId: event.pointerId,
                      x: event.clientX,
                      width: previewWidth(),
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.preventDefault();
                  }}
                  onPointerMove={(event) => {
                    if (dragStart?.pointerId !== event.pointerId) return;
                    setPreviewWidth(
                      clampPreviewWidth(dragStart.width + event.clientX - dragStart.x),
                    );
                  }}
                  onPointerUp={(event) => {
                    if (dragStart?.pointerId !== event.pointerId) return;
                    dragStart = undefined;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onLostPointerCapture={() => (dragStart = undefined)}
                >
                  <span class={styles.resizeGrip} aria-hidden="true" />
                  <span>{previewWidth()}px</span>
                </button>
              </div>
            </div>
            <div class={styles.valueLine}>
              <span>Current value</span>
              <code>{iso(value())}</code>
            </div>
          </div>
          <div class={styles.codePanel}>
            <div class={styles.codeTop}>
              <span>Appointment.tsx</span>
              <span>TSX</span>
            </div>
            <pre>
              <code>{code()}</code>
            </pre>
          </div>
        </div>
      </section>

      <section class={styles.notes}>
        <div>
          <span>01</span>
          <h3>Easy on the keyboard</h3>
          <p>
            Move between segments with arrow keys, type a value, or use up and down to adjust it.
          </p>
        </div>
        <div>
          <span>02</span>
          <h3>Right for each locale</h3>
          <p>Date order, separators, and 12 or 24-hour time all follow the locale you set.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Still feels familiar</h3>
          <p>
            Use the browser picker when it is useful, with a control you can style to fit your app.
          </p>
        </div>
      </section>
      <footer>
        <span>neodt</span>
        <span>Local time, without compromises.</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
};

export default App;
