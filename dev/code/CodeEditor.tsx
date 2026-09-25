import { createEffect, onCleanup, onMount, type JSX } from "solid-js";

import Code from "./Code";
import { createReportPosition } from "./createReportPosition";

import styles from "./code.module.css";

export default function CodeEditor(props: {
  id: string;
  children?: JSX.Element;
  value: string;
  onInput: (value: string) => void;
  ref: (element: HTMLTextAreaElement) => void;
}) {
  let container!: HTMLDivElement;
  let input!: HTMLTextAreaElement;
  let overlay!: HTMLPreElement;
  const syncScroll = () => {
    // Match the text viewport, including space consumed by native scrollbars.
    overlay.style.width = `${input.clientWidth}px`;
    overlay.style.height = `${input.clientHeight}px`;
    overlay.scrollTop = input.scrollTop;
    overlay.scrollLeft = input.scrollLeft;
  };
  createReportPosition(
    () => container,
    () => input,
    () => props.value,
    syncScroll,
  );
  onMount(() => {
    const observer = new ResizeObserver(syncScroll);
    observer.observe(input);
    onCleanup(() => observer.disconnect());
  });
  createEffect(() => {
    void props.value;
    // Reset/typing can clamp the native scroll position after the highlighted DOM updates.
    queueMicrotask(syncScroll);
  });
  return (
    <div ref={container} class={styles.editor} data-code-editor>
      <pre ref={overlay} class={styles.overlay} aria-hidden="true">
        <Code value={props.value} language="css" />
        {props.value.endsWith("\n") ? "\u200b" : ""}
      </pre>
      <textarea
        ref={(element) => {
          input = element;
          props.ref(element);
        }}
        id={props.id}
        value={props.value}
        spellcheck={false}
        autocapitalize="off"
        autocomplete="off"
        wrap="off"
        onInput={(event) => props.onInput(event.currentTarget.value)}
        onScroll={syncScroll}
      />
      {props.children}
    </div>
  );
}
