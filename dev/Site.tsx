import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import App from "./App";
import Docs, { pages } from "./docs/Docs";

export default function Site() {
  const [hash, setHash] = createSignal(location.hash);
  const update = () => setHash(location.hash);
  window.addEventListener("hashchange", update);
  onCleanup(() => window.removeEventListener("hashchange", update));
  const page = () => (hash().startsWith("#/docs/") ? hash().slice(7).split("/")[0] : undefined);
  const section = () => (page() ? hash().slice(7).split("/")[1] : undefined);
  createEffect(() => {
    const id = page();
    document.title = id
      ? `${pages.find(([slug]) => slug === id)?.[1] ?? "Documentation"} · neodt`
      : "neodt — A datetime input for Solid";
    const target = id ? section() : hash().slice(1);
    const frame = requestAnimationFrame(() => {
      const heading = target ? document.getElementById(target) : null;
      if (heading) heading.scrollIntoView();
      else if (id) window.scrollTo(0, 0);
    });
    onCleanup(() => cancelAnimationFrame(frame));
  });
  return (
    <Show when={page()} fallback={<App />}>
      <Docs page={page()!} />
    </Show>
  );
}
