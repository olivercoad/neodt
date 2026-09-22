import { createMemo } from "solid-js";

import { highlight, type CodeLanguage } from "./highlight";

import styles from "./code.module.css";

export default function Code(props: { value: string; language: CodeLanguage }) {
  const html = createMemo(() => highlight(props.value, props.language));
  return <code class={styles.highlight} data-language={props.language} innerHTML={html()} />;
}
