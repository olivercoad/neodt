import { defineConfig } from "tsdown";

import { libraries, datetimePackages } from "./libraries.ts";
import { libraryEntries } from "./scripts/library-entries.ts";

export default defineConfig({
  entry: Object.fromEntries([
    ["generic", "src/generic.tsx"],
    ...libraries.map((library) => [library.entry.slice(1) || "index", library.source]),
  ]),
  plugins: [libraryEntries()],
  platform: "neutral",
  deps: { neverBundle: datetimePackages },
  css: { inject: true },
  exports: { legacy: false },
  outExtensions: () => ({ js: ".jsx" }),
});
