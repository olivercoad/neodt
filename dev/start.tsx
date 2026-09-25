import type { FrameworkId } from "../frameworks";
import type { DateAdapter } from "../src/adapter";
import type { DemoControl } from "./framework-host";
import type { LibraryId } from "./libraries";
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
