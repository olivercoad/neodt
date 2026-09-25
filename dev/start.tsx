import { frameworks, demoPath, type FrameworkId } from "../frameworks";
import type { DateAdapter } from "../src/adapter";
import type { DemoControl } from "./framework-host";
import { libraries, libraryPath, type LibraryId } from "./libraries";
import { createDemoLibrary } from "./library";
import { mount } from "./mount";

export async function start<T, TZone>(
  id: LibraryId,
  adapter: DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
  framework: FrameworkId,
  Control: DemoControl,
) {
  document.documentElement.dataset.framework = framework;
  document.documentElement.dataset.adapter = id;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("fixture") === "layout") {
    const { mountLayout } = await import("./layout");
    mountLayout(createDemoLibrary(id, adapter, zone, Control));
  } else {
    mount(id, adapter, zone, Control);
  }
}

export function nativeUnavailable(framework: FrameworkId) {
  document.documentElement.dataset.framework = framework;
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
  const frameworkLabel = document.createElement("label");
  frameworkLabel.textContent = "Choose a frontend framework ";
  const frameworkSelect = document.createElement("select");
  frameworkSelect.setAttribute("aria-label", "Frontend framework");
  for (const item of frameworks) frameworkSelect.add(new Option(item.label, item.id));
  frameworkSelect.value = framework;
  frameworkSelect.onchange = () =>
    location.assign(
      demoPath(frameworkSelect.value as FrameworkId, "native-temporal") + location.hash,
    );
  frameworkLabel.append(frameworkSelect);
  root.append(heading, frameworkLabel, label);
}
