import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
} from "solid-js";

import Code from "../code/Code";
import { locales } from "../locales";
import SiteNav from "../SiteNav";
import Libraries from "./Libraries";
import Styling from "./Styling";

import styles from "./docs.module.css";

export const pages = [
  ["getting-started", "Getting started"],
  ["api", "API reference"],
  ["libraries", "Datetime libraries"],
  ["styling", "Styling gallery"],
  ["interaction", "Keyboard & natural language"],
] as const;

const example = `import { createSignal } from "solid-js";
import Neodt from "@olicoad/neodt";

export function Appointment() {
  const [value, setValue] = createSignal<Temporal.ZonedDateTime | null>(null);
  const referenceTime = Temporal.Now.zonedDateTimeISO("Australia/Sydney");

  return (
    <>
      <span id="appointment-label">Appointment time</span>
      <Neodt
        aria-labelledby="appointment-label"
        referenceTime={referenceTime}
        locale="en-AU"
        value={value()}
        onValueChange={setValue}
      />
      <input type="hidden" name="appointment" value={value()?.toString() ?? ""} />
    </>
  );
}`;

function GettingStarted() {
  return (
    <>
      <p class={styles.eyebrow}>GETTING STARTED</p>
      <h1>
        Date and time,
        <br />
        without the guesswork.
      </h1>
      <p class={styles.intro}>
        A segmented date and time input for Solid, with locale-aware formatting and your choice of
        datetime library.
      </p>
      <h2 id="install">Install</h2>
      <pre>
        <code>pnpm add @olicoad/neodt solid-js</code>
      </pre>
      <p>
        Use Solid 1.6 or later with a build setup that compiles JSX in dependencies, such as Vite
        with vite-plugin-solid. The package ships preserved JSX and imports its own stylesheet.
      </p>
      <p>
        The default import uses native <code>Temporal.ZonedDateTime</code> values. Your browser must
        provide Temporal. For a polyfill, another datetime library, or a custom adapter, see{" "}
        <a href="#/docs/libraries">Datetime libraries</a>. TypeScript 6 or later projects can enable
        Temporal types with <code>lib: ["ESNext", "DOM"]</code>.
      </p>
      <h2 id="a-controlled-field">A controlled field</h2>
      <pre>
        <Code value={example} language="tsx" />
      </pre>
      <p>
        <code>referenceTime</code> supplies the timezone, the defaults for empty segments, and the
        anchor for relative phrases and two-digit years. Keep it stable for a predictable editing
        session; update it when your application needs a new reference.
      </p>
      <h2 id="values-and-forms">Values and forms</h2>
      <p>
        Pass <code>null</code> for a controlled empty field. Clearing a segment emits{" "}
        <code>null</code>; the remaining segments stay visible while the user completes the date.
        Omit <code>value</code> and optionally provide <code>defaultValue</code> for an uncontrolled
        field.
      </p>
      <p>
        The root is a span, so a native label’s <code>for</code> attribute cannot label it. Use{" "}
        <code>aria-label</code> or <code>aria-labelledby</code>. For form submission, mirror the
        value into a hidden input as above and handle validation in your application.
      </p>
      <h2 id="styles-and-rendering">Styles and rendering</h2>
      <p>
        If your build removes dependency side effects, explicitly import{" "}
        <code>@olicoad/neodt/style.css</code>. Put your theme after the default stylesheet. Explore
        the <a href="#/docs/styling">styling gallery</a> for live examples.
      </p>
      <p>
        Server rendering is supported, but editing and layout measurement require a browser. Use the
        same explicit locale, reference time, and value on the server and client to keep hydration
        predictable. Native picker availability and appearance depend on the browser.
      </p>
    </>
  );
}
function Api() {
  const props = [
    [
      "referenceTime",
      "Temporal.ZonedDateTime · required",
      "Timezone and defaults for partial dates, relative input, and two-digit years.",
    ],
    [
      "value",
      "Temporal.ZonedDateTime | null",
      "Controlled value. Undefined selects uncontrolled mode; null clears the field.",
    ],
    ["defaultValue", "Temporal.ZonedDateTime", "Initial uncontrolled value."],
    [
      "onValueChange",
      "(Temporal.ZonedDateTime | null) => void",
      "Receives complete values and null when cleared. Values use the reference timezone.",
    ],
    [
      "locale",
      "Intl.LocalesArgument",
      "Segment order, punctuation, and day-period labels. Defaults to the system locale.",
    ],
    [
      "formatOptions",
      "Intl.DateTimeFormatOptions",
      "Locale formatting overrides, including hour12 and hourCycle. Editable precision is year through minute; seconds are not editable segments.",
    ],
    [
      "showTimeOffset",
      "boolean",
      "Displays the selected date’s UTC offset, including non-whole-hour offsets.",
    ],
    [
      "readonly / disabled",
      "boolean",
      "Both prevent editing and remove actions. Disabled also dims the control. Segments in either state are outside the tab order.",
    ],
    [
      "calendarIcon / magicIcon",
      "JSX.Element",
      "Replace the native picker or natural-language trigger icon.",
    ],
    ["style", "JSX.CSSProperties", "Inline styles use Solid’s object syntax."],
    [
      "class / classList / ARIA",
      "Span attributes",
      "Forwarded to the root span. Accessible naming is also applied to the editor group.",
    ],
  ];
  return (
    <>
      <p class={styles.eyebrow}>API REFERENCE</p>
      <h1>
        The component
        <br />
        and its helpers.
      </h1>
      <p class={styles.intro}>
        Import Neodt as the default or a named export. The public prop type is{" "}
        <code>NeodtProps</code>. The default entry uses native Temporal; see{" "}
        <a href="#/docs/libraries">Datetime libraries</a> for other value types and custom adapters.
      </p>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Prop</th>
              <th>Type</th>
              <th>Behaviour</th>
            </tr>
          </thead>
          <tbody>
            <For each={props}>
              {([name, type, description]) => (
                <tr>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>
                    <code>{type}</code>
                  </td>
                  <td>{description}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <h2 id="timezone-behaviour">Timezone behaviour</h2>
      <p>
        Values are normalised to the zone of <code>referenceTime</code>. Locale controls
        presentation, not the timezone. The offset shown belongs to the selected date, so it can
        change across daylight saving transitions. Calendar arithmetic, month lengths, offsets, and
        timezone resolution are provided by the selected datetime library. Every adapter follows its
        library's arithmetic and timezone rules. Intl is used only for presentation.
      </p>
      <h2 id="natural-language-parser">Natural-language parser</h2>
      <pre>
        <Code
          language="tsx"
          value={`import { parseNaturalDate, getNaturalDateCompletions } from "@olicoad/neodt";

const result = parseNaturalDate("tomorrow 9am", {
  referenceTime,
  zone: referenceTime.timeZoneId,
  locale: "en-AU",
});
const suggestions = getNaturalDateCompletions("tom", 5);`}
        />
      </pre>
      <p>
        <code>parseNaturalDate</code> returns a <code>Temporal.ZonedDateTime</code> or undefined
        when the text cannot be parsed. The optional zone is a timezone identifier and defaults to
        the reference’s zone. <code>getNaturalDateCompletions</code> returns labels and replacement
        text. The associated types are <code>NaturalDateParseOptions</code> and{" "}
        <code>NaturalDateCompletion</code>.
      </p>
      <h2 id="controlled-updates">Controlled updates</h2>
      <p>
        Parent value replacements reset the displayed draft. Passing null clears every segment.
        While typing an incomplete date, the control emits null and keeps the local draft; passing
        emitted values back through onValueChange preserves ongoing numeric entry. Use
        aria-describedby and aria-invalid to associate application validation with the segments.
      </p>
      <h2 id="current-boundaries">Current boundaries</h2>
      <p>
        This is a JavaScript-managed date and time control with minute precision. It does not
        provide native form validation, min/max limits, date ranges, or a custom calendar popup.
        Applications can validate emitted values before accepting or submitting them.
      </p>
    </>
  );
}
function Interaction() {
  return (
    <>
      <p class={styles.eyebrow}>INTERACTION</p>
      <h1>
        Start with
        <br />
        the keyboard.
      </h1>
      <p class={styles.intro}>
        The segmented editor uses one tab stop. Arrow keys move within it, including its action
        buttons.
      </p>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={[
                ["← / →", "Move between segments and actions."],
                ["↑ / ↓", "Increase or decrease the selected segment."],
                ["Digits", "Replace a numeric segment; move on once it is complete."],
                ["A / P", "Set AM or PM. Localised day-period labels are also accepted."],
                ["Home / End", "Move to the first segment or final action."],
                ["Space", "Open the browser’s native picker from a segment."],
                ["@", "Open natural-language entry."],
                ["Ctrl/⌘ + A, then Delete", "Select and clear all segments."],
                [
                  "Backspace / Delete",
                  "Clear a segment. Backspace on an empty segment moves back and clears the previous one.",
                ],
                ["Ctrl/⌘ + C / V", "Copy or paste a date in the segmented editor."],
              ]}
            >
              {([key, action]) => (
                <tr>
                  <td>
                    <kbd>{key}</kbd>
                  </td>
                  <td>{action}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <h2 id="say-what-you-mean">Say what you mean</h2>
      <p>
        Try <code>tomorrow 9:30am</code>, <code>in 2 hours</code>, or{" "}
        <code>5pm America/New_York</code>. Relative phrases use the supplied reference time. The
        parser accepts a single point in time; English natural-language phrases are supported, while
        locale affects numeric dates and display.
      </p>
      <p>
        A preview appears when the text parses. Press Enter to commit it or Escape to return to the
        segments. Up and down cycle completion suggestions; Tab accepts a suggestion at the end of
        the input. If there is no suggestion to accept, Tab moves focus normally. Empty or invalid
        text does not commit a new date.
      </p>
      <h2 id="accessibility-and-motion">Accessibility and motion</h2>
      <p>
        Give every control an accessible name. Focus and selection colours should remain readable in
        your theme. Reduced-motion preferences disable the control’s transitions and animated
        natural-language placeholder. The hidden measurement copies are excluded from the
        accessibility tree.
      </p>
      <p>
        Try the <a href="#/docs/styling">live styling examples</a> at narrow widths, with a
        keyboard, and in readonly and disabled states. Before release, also check your application
        with a screen reader and touch device.
      </p>
    </>
  );
}

export default function Docs(props: { page: string }) {
  let content!: HTMLElement;
  const [sections, setSections] = createSignal<{ id: string; label: string }[]>([]);
  const [activeSection, setActiveSection] = createSignal<string>();
  createEffect(
    on(
      () => props.page,
      () => {
        setActiveSection(undefined);
        let headings: HTMLElement[] = [];
        let frame: number | undefined;
        const updateActiveSection = () => {
          frame = undefined;
          let active: string | undefined;
          for (const heading of headings) {
            const offset = parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
            if (heading.getBoundingClientRect().top > offset + 1) break;
            active = heading.id;
          }
          // The final section may be too short to reach the top of the viewport.
          if (
            window.scrollY > 0 &&
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
          ) {
            active = headings.at(-1)?.id;
          }
          setActiveSection(active);
        };
        const scheduleUpdate = () => {
          if (frame === undefined) frame = requestAnimationFrame(updateActiveSection);
        };
        const observer = new ResizeObserver(scheduleUpdate);
        // Read the outline after the selected page has rendered.
        frame = requestAnimationFrame(() => {
          headings = Array.from(content.querySelectorAll<HTMLElement>("h2[id]"));
          setSections(
            headings.map((heading) => ({
              id: heading.id,
              label: heading.textContent ?? "",
            })),
          );
          observer.observe(content);
          updateActiveSection();
        });
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        onCleanup(() => {
          if (frame !== undefined) cancelAnimationFrame(frame);
          observer.disconnect();
          window.removeEventListener("scroll", scheduleUpdate);
          window.removeEventListener("resize", scheduleUpdate);
        });
      },
    ),
  );
  const [locale, setLocale] = createSignal("en-GB");
  const [hour12, setHour12] = createSignal("locale");
  const [showTimeOffset, setShowTimeOffset] = createSignal(true);
  const previewOptions = createMemo(() => ({
    locale: locale() || undefined,
    formatOptions: hour12() === "locale" ? {} : { hour12: hour12() === "12" },
    showTimeOffset: showTimeOffset(),
  }));
  return (
    <div class={styles.page}>
      <SiteNav />
      <div class={styles.layout}>
        <aside>
          <nav aria-label="Documentation">
            <span class={styles.eyebrow}>DOCUMENTATION</span>
            <For each={pages}>
              {([id, label]) => (
                <div class={styles.navPage}>
                  <a href={`#/docs/${id}`} aria-current={props.page === id ? "page" : undefined}>
                    {label}
                  </a>
                  <Show when={props.page === id}>
                    <ul class={styles.sectionLinks}>
                      <For each={sections()}>
                        {(section) => (
                          <li>
                            <a
                              href={`#/docs/${id}/${section.id}`}
                              aria-current={activeSection() === section.id ? "location" : undefined}
                            >
                              {section.label}
                            </a>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
              )}
            </For>
            <Show when={props.page === "styling"}>
              <fieldset class={styles.galleryControls}>
                <legend>All previews</legend>
                <label>
                  Locale
                  <select value={locale()} onChange={(e) => setLocale(e.currentTarget.value)}>
                    <For each={locales}>
                      {([value, label]) => <option value={value}>{label}</option>}
                    </For>
                  </select>
                </label>
                <label>
                  Hour12
                  <select value={hour12()} onChange={(e) => setHour12(e.currentTarget.value)}>
                    <option value="locale">Locale default</option>
                    <option value="12">12 hour</option>
                    <option value="24">24 hour</option>
                  </select>
                </label>
                <label class={styles.offsetToggle}>
                  <input
                    type="checkbox"
                    checked={showTimeOffset()}
                    onChange={(e) => setShowTimeOffset(e.currentTarget.checked)}
                  />
                  Show time offset
                </label>
              </fieldset>
            </Show>
          </nav>
        </aside>
        <main ref={content} id="docs-content" class={styles.content}>
          <Switch
            fallback={
              <>
                <h1>Page not found</h1>
                <a href="#/docs/getting-started">Go to getting started</a>
              </>
            }
          >
            <Match when={props.page === "getting-started"}>
              <GettingStarted />
            </Match>
            <Match when={props.page === "api"}>
              <Api />
            </Match>
            <Match when={props.page === "libraries"}>
              <Libraries />
            </Match>
            <Match when={props.page === "styling"}>
              <Styling options={previewOptions()} />
            </Match>
            <Match when={props.page === "interaction"}>
              <Interaction />
            </Match>
          </Switch>
        </main>
      </div>
    </div>
  );
}
