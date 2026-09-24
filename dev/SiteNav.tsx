import { createSignal, For, onCleanup } from "solid-js";

import { libraries, libraryPath } from "./libraries";
import { useLibrary } from "./library";

import styles from "./SiteNav.module.css";

export default function SiteNav() {
  const library = useLibrary();
  const [hash, setHash] = createSignal(location.hash);
  let picker!: HTMLDetailsElement;
  let trigger!: HTMLElement;
  const update = () => {
    setHash(location.hash);
    picker.open = false;
  };
  const dismiss = (event: PointerEvent) => {
    if (!picker.contains(event.target as Node)) picker.open = false;
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && picker.open) {
      picker.open = false;
      trigger.focus();
    }
  };
  window.addEventListener("hashchange", update);
  window.addEventListener("pointerdown", dismiss);
  window.addEventListener("keydown", escape);
  onCleanup(() => {
    window.removeEventListener("hashchange", update);
    window.removeEventListener("pointerdown", dismiss);
    window.removeEventListener("keydown", escape);
  });
  return (
    <nav class={styles.nav} aria-label="Main navigation">
      <a class={styles.brand} href={libraryPath(library.id)} aria-label="neodt home">
        <span aria-hidden="true">n</span> neodt
      </a>
      <div class={styles.pages}>
        <a href="#lab" aria-current={hash() === "#lab" ? "location" : undefined}>
          Lab
        </a>
        <a
          href="#/docs/getting-started"
          aria-current={
            hash().startsWith("#/docs/") && !hash().startsWith("#/docs/styling")
              ? "page"
              : undefined
          }
        >
          Docs
        </a>
        <a
          href="#/docs/styling"
          aria-current={hash().startsWith("#/docs/styling") ? "page" : undefined}
        >
          Styling
        </a>
      </div>
      <div class={styles.tools}>
        <details class={styles.picker} ref={picker}>
          <summary ref={trigger} aria-label="Datetime library" class={styles.trigger}>
            <span class={styles.pickerLabel}>Library</span>
            <span class={styles.selected}>{library.label}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div class={styles.libraryPanel}>
            <p>Choose your datetime library</p>
            <div class={styles.libraryList}>
              <For each={libraries}>
                {(item) => (
                  <a
                    href={libraryPath(item.id) + hash()}
                    aria-current={item.id === library.id ? "true" : undefined}
                    onClick={(event) => {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      picker.open = false;
                      if (item.id === library.id) event.preventDefault();
                    }}
                  >
                    <span>{item.label}</span>
                    <span class={styles.check} aria-hidden="true">
                      {item.id === library.id ? "✓" : ""}
                    </span>
                  </a>
                )}
              </For>
            </div>
          </div>
        </details>
        <a
          class={styles.github}
          href="https://github.com/olivercoad/neodt"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository (opens in a new tab)"
          title="View source on GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
