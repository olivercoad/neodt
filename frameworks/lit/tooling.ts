import { readFile } from "node:fs/promises";
import path from "node:path";

import type { FrameworkTooling } from "../tooling.ts";
import { generateComponent } from "./generate.ts";
export default {
  generateComponent,
  build: {
    plugins: [
      {
        name: "lit-shadow-styles",
        resolveId(id, importer) {
          if (id.endsWith(".css?inline") && importer)
            return path.resolve(path.dirname(importer), id);
        },
        async load(id) {
          if (id.endsWith(".css?inline"))
            return `export default ${JSON.stringify(await readFile(id.slice(0, -7), "utf8"))};`;
        },
      },
    ],
  },
  consumer: {
    extension: "ts",
    render: (generic, callback) =>
      `export const control = new Neodt${generic ? "<typeof referenceTime, typeof adapter extends import('@olicoad/neodt/lit/generic').DateAdapter<infer _T, infer Z> ? Z : never>" : ""}();
control.props = { ${generic ? "adapter," : ""} referenceTime, onValueChange: value => { ${callback}; } };
// @ts-expect-error Mixed datetime values must be rejected.
control.props = { ...control.props, value: "invalid" };`,
  },
} satisfies FrameworkTooling;
