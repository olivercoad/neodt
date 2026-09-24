import { render } from "solid-js/web";

import type { DateAdapter } from "../src/adapter";
import type { LibraryId } from "./libraries";
import { createDemoLibrary, LibraryContext } from "./library";
import Site from "./Site";

import "./styles.css";

export function mount<T, TZone>(
  id: LibraryId,
  adapter: DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
) {
  const library = createDemoLibrary(id, adapter, zone);
  document.documentElement.dataset.adapter = id;
  render(
    () => (
      <LibraryContext.Provider value={library}>
        <Site />
      </LibraryContext.Provider>
    ),
    document.getElementById("root")!,
  );
}
