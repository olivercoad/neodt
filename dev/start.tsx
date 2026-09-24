import type { DateAdapter } from "../src/adapter";
import { libraries, libraryPath, type LibraryId } from "./libraries";
import { createDemoLibrary } from "./library";
import { mount } from "./mount";

export async function start<T, TZone>(
  id: LibraryId,
  adapter: DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
) {
  document.documentElement.dataset.adapter = id;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("fixture") === "layout") {
    const { mountLayout } = await import("./layout");
    mountLayout(createDemoLibrary(id, adapter, zone));
  } else {
    mount(id, adapter, zone);
  }
}

export function nativeUnavailable() {
  document.documentElement.dataset.adapter = "native-temporal";
  const root = document.getElementById("root")!;
  const heading = document.createElement("h1");
  heading.textContent = "Native Temporal is unavailable in this browser";
  const label = document.createElement("label");
  label.textContent = "Choose a datetime library ";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Datetime library");
  for (const library of libraries) select.add(new Option(library.label, library.id));
  select.value = "native-temporal";
  select.onchange = () => {
    const next = select.value as LibraryId;
    select.value = "native-temporal";
    location.assign(libraryPath(next) + location.hash);
  };
  label.append(select);
  root.append(heading, label);
}
