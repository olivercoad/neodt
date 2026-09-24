import { For } from "solid-js";

import { libraries, libraryPath, type LibraryId } from "./libraries";
import { useLibrary } from "./library";

import styles from "./App.module.css";

export default function SiteNav() {
  const library = useLibrary();
  return (
    <nav class={styles.nav} aria-label="Main navigation">
      <a class={styles.brand} href="#top">
        <span>n</span> neodt
      </a>
      <div class={styles.navLinks}>
        <label class={styles.libraryPicker}>
          Library
          <select
            aria-label="Datetime library"
            value={library.id}
            onChange={(event) => {
              const next = event.currentTarget.value as LibraryId;
              // Back/forward cache restores form state from the page we leave.
              event.currentTarget.value = library.id;
              location.assign(libraryPath(next) + location.hash);
            }}
          >
            <For each={libraries}>{(item) => <option value={item.id}>{item.label}</option>}</For>
          </select>
        </label>
        <a href="#lab">Lab</a>
        <a href="#/docs/getting-started">Docs</a>
        <a href="#/docs/styling">Styling</a>
        <a href="https://github.com/olivercoad/neodt" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>
    </nav>
  );
}
