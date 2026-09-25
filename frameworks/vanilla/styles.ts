import css from "../../src/styles.css?inline";

const styles = new WeakMap<Document, HTMLStyleElement>();

/** Install defaults once per document, before application styles so themes can override them. */
export function installStyles(document: Document) {
  if (styles.get(document)?.isConnected) return;
  const style = document.createElement("style");
  style.dataset.neodt = "";
  style.textContent = css;
  document.head.prepend(style);
  styles.set(document, style);
}
