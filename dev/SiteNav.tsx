import styles from "./App.module.css";

export default function SiteNav() {
  return (
    <nav class={styles.nav} aria-label="Main navigation">
      <a class={styles.brand} href="#top">
        <span>n</span> neodt
      </a>
      <div class={styles.navLinks}>
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
