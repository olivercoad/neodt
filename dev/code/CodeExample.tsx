import { Show } from "solid-js";

import Code from "./Code";
import { createReportPosition } from "./createReportPosition";
import ReportIssue, { type ExampleProps } from "./ReportIssue";

import styles from "./code.module.css";

export default function CodeExample(props: ExampleProps & { reportIssue?: boolean }) {
  let container!: HTMLDivElement;
  let code!: HTMLPreElement;
  createReportPosition(
    () => container,
    () => code,
    () => props.value,
  );
  return (
    <div ref={container} class={styles.example}>
      <pre ref={code}>
        <Code value={props.value} language={props.language} />
      </pre>
      <Show when={props.reportIssue !== false}>
        <ReportIssue {...props} />
      </Show>
    </div>
  );
}
