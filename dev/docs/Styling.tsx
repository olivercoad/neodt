import { createSignal, For, onCleanup, onMount, type JSX } from "solid-js";
import { render } from "solid-js/web";

import Code from "../code/Code";
import CodeEditor from "../code/CodeEditor";
import { useLibrary } from "../library";
import ResizablePreview from "../ResizablePreview";
import { createResizeScrollAnchor } from "./createResizeScrollAnchor";
import { themes } from "./themes";

import componentCss from "../../src/styles.css?raw";
import styles from "./docs.module.css";

export interface StylingOptions {
  locale?: string;
  formatOptions: Intl.DateTimeFormatOptions;
  showTimeOffset: boolean;
}

function Preview(props: {
  theme: (typeof themes)[number];
  css: string;
  children?: JSX.Element;
  state: "Editable" | "Readonly" | "Disabled";
  options: StylingOptions;
}) {
  const library = useLibrary();
  const Neodt = library.Neodt;
  let host!: HTMLDivElement;
  onMount(() => {
    // Isolate reader CSS while sharing the reactive options and theme across states.
    const shadow = host.attachShadow({ mode: "open" });
    const reference = library.date("2026-08-17T15:30[Australia/Sydney]");
    const dispose = render(
      () => (
        <>
          <style>{componentCss}</style>
          <style>{props.css}</style>
          <Neodt
            class={`theme-${props.theme.id}`}
            aria-label={`${props.theme.name} ${props.state.toLowerCase()} appointment`}
            referenceTime={reference}
            defaultValue={reference}
            locale={props.options.locale}
            formatOptions={props.options.formatOptions}
            showTimeOffset={props.options.showTimeOffset}
            readonly={props.state === "Readonly"}
            disabled={props.state === "Disabled"}
          />
        </>
      ),
      shadow,
    );
    onCleanup(dispose);
  });
  return (
    <div class={styles.previewVariant} data-preview-state={props.state.toLowerCase()}>
      <span class={styles.variantLabel}>{props.state}</span>
      <div class={styles.previewControl}>
        <div class={styles.previewHost} ref={host} />
        {props.children}
      </div>
    </div>
  );
}

function ThemeExample(props: {
  theme: (typeof themes)[number];
  options: StylingOptions;
  width: number;
  onWidthChange: (width: number) => void;
  onResizeStart: (grip: HTMLElement) => void;
  onResizeEnd: () => void;
}) {
  const [css, setCss] = createSignal(props.theme.css);
  const [copied, setCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal("");
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  const clearCopyStatus = () => {
    clearTimeout(copyTimer);
    setCopied(false);
    setCopyError("");
  };
  onCleanup(() => clearTimeout(copyTimer));
  let editor!: HTMLTextAreaElement;
  const copy = async () => {
    clearCopyStatus();
    try {
      await navigator.clipboard.writeText(css());
      setCopied(true);
      copyTimer = setTimeout(() => setCopied(false), 2000);
    } catch {
      editor.focus();
      editor.select();
      setCopyError("CSS selected. Press Ctrl+C or ⌘C to copy.");
    }
  };
  return (
    <article class={styles.example} aria-labelledby={`theme-${props.theme.id}`}>
      <div class={styles.exampleHeading}>
        <h2 id={`theme-${props.theme.id}`}>{props.theme.name}</h2>
        <p>{props.theme.description}</p>
      </div>
      <div class={styles.exampleColumns}>
        <div class={styles.preview}>
          <ResizablePreview
            width={props.width}
            onWidthChange={props.onWidthChange}
            label={`Resize ${props.theme.name} previews`}
            themeId={props.theme.id}
            onResizeStart={props.onResizeStart}
            onResizeEnd={props.onResizeEnd}
          >
            {(grip) => (
              <For each={["Editable", "Readonly", "Disabled"] as const}>
                {(state) => (
                  <Preview theme={props.theme} css={css()} state={state} options={props.options}>
                    {state === "Editable" && grip}
                  </Preview>
                )}
              </For>
            )}
          </ResizablePreview>
          <span class={styles.usageCode}>
            <Code
              value={`<Neodt
  class="theme-${props.theme.id}"
  referenceTime={referenceTime}
/>`}
              language="tsx"
            />
          </span>
        </div>
        <div class={styles.cssEditor}>
          <div class={styles.editorToolbar}>
            <label for={`css-${props.theme.id}`}>Editable CSS</label>
            <button
              type="button"
              onClick={() => {
                setCss(props.theme.css);
                clearCopyStatus();
              }}
            >
              Reset
            </button>
            <button type="button" onClick={copy} aria-live="polite">
              {copied() ? "✓ Copied" : "Copy CSS"}
            </button>
            <span class={styles.copyStatus} role="status" aria-label="Copy status">
              {copyError()}
            </span>
          </div>
          <CodeEditor
            ref={(element) => {
              editor = element;
            }}
            id={`css-${props.theme.id}`}
            value={css()}
            onInput={(value) => {
              setCss(value);
              clearCopyStatus();
            }}
          />
        </div>
      </div>
    </article>
  );
}

export default function Styling(props: { options: StylingOptions }) {
  const [width, setWidth] = createSignal(320);
  let cards!: HTMLDivElement;
  const resizeAnchor = createResizeScrollAnchor(() => cards);
  return (
    <>
      <p class={styles.eyebrow}>STYLING</p>
      <h1>
        A familiar input.
        <br />
        Your own style.
      </h1>
      <p class={styles.intro}>
        Change the CSS next to any example to see it update immediately. Copy it into your app and
        add the matching class to Neodt. Drag the width grip to resize every preview. The controls
        in the documentation nav apply to every preview.
      </p>
      <p>
        Load your theme after the component stylesheet. Set variables on the component class itself:
        the default variables are declared on <code>.datetime-neo</code>, so an ancestor’s variables
        alone will not override them.
      </p>
      <div ref={cards}>
        <For each={themes}>
          {(theme) => (
            <ThemeExample
              theme={theme}
              options={props.options}
              width={width()}
              onWidthChange={setWidth}
              onResizeStart={resizeAnchor.start}
              onResizeEnd={resizeAnchor.finish}
            />
          )}
        </For>
      </div>
      <h2 id="theme-variables">Theme variables</h2>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Variable suffix</th>
              <th>Controls</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={[
                ["background / foreground", "The surface and text colours"],
                ["border / focus / focus-ring", "Border, focused border, and outer focus ring"],
                ["highlight / highlight-foreground", "Selected segment background and text"],
                ["hover", "Segment and action hover backgrounds"],
                [
                  "segment-padding / segment-line-height",
                  "Shared metrics for segments, natural input, completion, and preview",
                ],
              ]}
            >
              {([name, description]) => (
                <tr>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{description}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <p>
        Prefix each name with <code>--datetime-neo-</code>. Focus ring, highlight, and hover colours
        derive from the focus colour unless overridden. Readonly mode supplies its own muted
        background and border; use a class such as <code>.theme-paper[data-readonly]</code> to
        customise those.
      </p>
      <h2 id="keep-layout-predictable">Keep layout predictable</h2>
      <p>
        Width, font, border radius, colours, and the shared spacing variables are the easiest
        customisations. Try a narrow width and both editing modes after changing font metrics. The
        control measures its content and switches to two rows when needed.
      </p>
      <p>
        Internal editor, measurement, trailing, and row elements work together. Avoid overriding
        their display, overflow, positioning, or margins. The measurement copies must use the same
        typography as the visible segments. The <code>--datetime-neo-actions-width</code> variable
        is calculated by the component and should be left alone.
      </p>
    </>
  );
}
