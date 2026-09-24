import { makePersisted, type PersistenceOptions } from "@solid-primitives/storage";
import { createMemo, createSignal, For, onCleanup, onMount, type Component } from "solid-js";

import packageJson from "../package.json";
import Code from "./code/Code";
import { useLibrary, type DemoValue } from "./library";
import { locales } from "./locales";
import SiteNav from "./SiteNav";

import styles from "./App.module.css";

const systemTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

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

const minimumPreviewWidth = 100;

function makePersistedSignal<T>(initialValue: T, options: PersistenceOptions<T, undefined>) {
  return makePersisted(createSignal(initialValue), options);
}

function iso(date: DemoValue | null): string {
  return date?.toString({ smallestUnit: "minute" }) ?? "null";
}

const App: Component = () => {
  const library = useLibrary();
  const Neodt = library.Neodt;
  const initialValue = library.date("2026-08-24T14:30[Australia/Sydney]");
  const restoreDate = (value: string, zone: string) => {
    try {
      return library.date(value, zone);
    } catch {
      return library.now(zone);
    }
  };
  const [timezone, setTimezone] = makePersistedSignal<Timezone>(systemTimezone, {
    name: "neodt-configuration-lab-timezone",
  });
  const [now, setNow] = createSignal(library.now());
  const referenceTimeInputReference = () => now().withTimeZone(timezone());
  const [referenceTime, setReferenceTime] = makePersistedSignal(referenceTimeInputReference(), {
    name: "neodt-configuration-lab-reference-time",
    serialize: (value) => value.toString(),
    deserialize: (value) => restoreDate(value, timezone()).withTimeZone(timezone()),
  });
  const [locale, setLocale] = makePersistedSignal<string | undefined>(undefined, {
    name: "neodt-configuration-lab-locale",
  });
  const [dayPeriod, setDayPeriod] = makePersistedSignal<DayPeriod>("locale", {
    name: "neodt-configuration-lab-day-period",
  });
  const [value, setValue] = makePersistedSignal<DemoValue | null>(initialValue, {
    name: "neodt-configuration-lab-value",
    serialize: (value) => iso(value),
    deserialize: (value) => (value === "null" ? null : restoreDate(value, timezone())),
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
  const [previewWidth, setPreviewWidth] = makePersistedSignal(260, {
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
    const timer = window.setInterval(() => setNow(library.now()), 60_000);
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
    return `import Neodt from '@olicoad/neodt${library.entry}'\n${library.imports}\nimport { createSignal } from 'solid-js'\n\nconst [referenceTime] = createSignal(${library.nowExpression})\nconst [value, setValue] = createSignal<${library.type} | null>(null)\n\n<Neodt\n${optionLines.join("\n")}\n/>`;
  });

  const reset = () => {
    setReferenceTime(library.now());
    setTimezone(systemTimezone);
    setLocale(undefined);
    setDayPeriod("locale");
    setValue(initialValue);
    setShowTimeOffset(false);
    setReadonly(false);
    setDisabled(false);
    setPreviewWidth(260);
  };

  const setReferenceTimezone = (nextTimezone: Timezone) => {
    setTimezone(nextTimezone);
    setReferenceTime(referenceTime().withTimeZone(nextTimezone));
  };

  return (
    <main class={styles.page}>
      <SiteNav />

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
            <code>{library.type}</code> instead of a string to untangle.
          </p>
          <div class={styles.install}>
            <code>
              pnpm add @olicoad/neodt solid-js{library.packages ? ` ${library.packages}` : ""}
            </code>
            <span>Solid 1.6+</span>
            <a href="https://www.npmjs.com/package/@olicoad/neodt" target="_blank" rel="noreferrer">
              v{packageJson.version} on npm ↗
            </a>
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

      <section id="lab" class={styles.playgroundSection}>
        <div class={styles.playgroundHeading}>
          <div>
            <p class={styles.kicker}>CONFIGURATION LAB</p>
            <h2>Make it yours.</h2>
            <p class={styles.playgroundIntro}>Set the defaults. Try the input. Take the code.</p>
          </div>
          <a class={styles.galleryLink} href="#/docs/styling">
            <div class={styles.gallerySamples} aria-hidden="true">
              <span>
                <span>{referenceTime().toPlainTime().toString({ smallestUnit: "minute" })}</span>
              </span>
              <span>
                <span>{referenceTime().toPlainTime().toString({ smallestUnit: "minute" })}</span>
              </span>
              <span>
                <span>{referenceTime().toPlainTime().toString({ smallestUnit: "minute" })}</span>
              </span>
            </div>
            <span class={styles.galleryTitle}>
              Styling gallery <span aria-hidden="true">↗</span>
            </span>
            <span class={styles.galleryDescription}>
              Find a look. Edit the CSS. Make it your own.
            </span>
          </a>
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
              <p class={styles.fieldHint}>Sets the timezone and fills in partial dates.</p>
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
              <code>{referenceTime().timeZoneId}</code>
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
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    setPreviewWidth(
                      clampPreviewWidth(previewWidth() + (event.key === "ArrowRight" ? 10 : -10)),
                    );
                  }}
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
              <Code value={code()} language="tsx" />
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
