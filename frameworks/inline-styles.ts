import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Rolldown } from "tsdown";

/** Match Vite's inline CSS imports in package builds. */
export function inlineStyles(): Rolldown.Plugin {
  return {
    name: "inline-styles",
    resolveId(id, importer) {
      if (id.endsWith(".css?inline") && importer) return path.resolve(path.dirname(importer), id);
    },
    async load(id) {
      if (id.endsWith(".css?inline"))
        return `export default ${JSON.stringify(await readFile(id.slice(0, -7), "utf8"))};`;
    },
  };
}
